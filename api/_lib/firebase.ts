import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  // Check if we have all credentials
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    // For development/demo mode without Firebase credentials
    console.warn(
      "Firebase credentials not found. Running in demo mode with mock data."
    );
    // Initialize with a dummy project for demo purposes
    admin.initializeApp({
      projectId: "demo-project",
    });
  }
}

export const firestore = admin.firestore();
export const isFirebaseConfigured = !!(projectId && clientEmail && privateKey);

import * as cheerio from "cheerio";
import axios from "axios";
import { storage } from "./storage";
import type { LocationWithEvents, InsertLocation, ScrapeResult } from "./types";

export function parseInitialFile(content: string): InsertLocation[] {
  const lines = content.split("\n");
  const locations: InsertLocation[] = [];

  // Skip header lines (first 2 usually in markdown table)
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("| --- |")) {
      startIndex = i + 1;
      break;
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || !line.startsWith("|")) continue;

    const parts = line.split("|").map((p) => p.trim());
    // Markdown table splits: empty, id, address, status, group, channel, link, empty
    if (parts.length < 7) continue;

    const numberStr = parts[1];
    const address = parts[2].replace(/\*\*/g, ""); // Remove bold markdown

    // Skip header or divider rows that might have been picked up
    if (address === "Адреса" || address === ":---") continue;

    const currentStatusRaw = parts[3];
    const group = parts[4] === "—" ? null : parts[4];
    const channelName = parts[5];

    // Extract URL from markdown link [Text](url)
    const linkMatch = parts[6].match(/\((.*?)\)/);
    const url = linkMatch ? linkMatch[1] : parts[6];

    if (!url) continue;

    locations.push({
      number: parseInt(numberStr) || 0,
      address,
      currentStatusRaw,
      group,
      channelName,
      url,
    });
  }

  return locations;
}

export async function scrapeLocation(
  location: LocationWithEvents
): Promise<ScrapeResult> {
  console.log(`Scraping ${location.address} (${location.url})...`);

  let html = "";
  try {
    const response = await axios.get(location.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 10000,
    });
    html = response.data;
  } catch (error) {
    console.error(`Failed to fetch ${location.url}:`, error);
    return { success: false, message: "Failed to fetch URL", newEventsCount: 0 };
  }

  const $ = cheerio.load(html);
  const messages = $(".tgme_widget_message");
  let newEventsCount = 0;

  // Existing events to prevent duplicates
  const existingEvents = await storage.getEventsByLocation(location.id);
  const existingTimestamps = new Set(
    existingEvents.map((e) => e.timestamp.getTime())
  );

  for (let i = 0; i < messages.length; i++) {
    const el = messages[i];
    const $el = $(el);

    const textContent = $el.find(".tgme_widget_message_text").text();
    const dateStr = $el.find(".tgme_widget_message_date time").attr("datetime");

    if (!textContent || !dateStr) continue;

    // Filter for red/green circles
    const hasRed = textContent.includes("🔴");
    const hasGreen = textContent.includes("🟢");

    if (!hasRed && !hasGreen) continue;

    const timestamp = new Date(dateStr);

    // Filter last 10 days
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    if (timestamp < tenDaysAgo) continue;

    // Check duplicate
    if (existingTimestamps.has(timestamp.getTime())) continue;

    // Determine status
    const isLightOn = hasGreen;

    await storage.createEvent({
      locationId: location.id,
      timestamp,
      isLightOn,
      message: textContent,
    });

    newEventsCount++;
  }

  // Update last scraped time
  await storage.updateLocationStatus(
    location.id,
    location.currentStatusRaw || "",
    new Date()
  );

  return { success: true, message: "Scraped successfully", newEventsCount };
}

import { firestore, isFirebaseConfigured } from "./firebase";
import type {
  Location,
  Event,
  LocationWithEvents,
  InsertLocation,
  InsertEvent,
  FirestoreLocationDoc,
  FirestoreEventDoc,
} from "./types";

// Demo data for when Firebase is not configured
const demoLocations: LocationWithEvents[] = [
  {
    id: 1,
    number: 1,
    address: "вул. Львівська, 22а (Demo)",
    currentStatusRaw: "Є вже 2год 15хв",
    group: "1",
    channelName: "@svitlobot_demo",
    url: "https://t.me/s/svitlobot_demo",
    lastScrapedAt: new Date(),
    events: [
      {
        id: 1,
        locationId: 1,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isLightOn: true,
        message: "🟢 Світло з'явилось",
        createdAt: new Date(),
      },
      {
        id: 2,
        locationId: 1,
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        isLightOn: false,
        message: "🔴 Світло зникло",
        createdAt: new Date(),
      },
    ],
  },
  {
    id: 2,
    number: 2,
    address: "вул. Хрещатик, 1 (Demo)",
    currentStatusRaw: "Немає 45хв",
    group: "2",
    channelName: "@svitlobot_demo2",
    url: "https://t.me/s/svitlobot_demo2",
    lastScrapedAt: new Date(),
    events: [
      {
        id: 3,
        locationId: 2,
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        isLightOn: false,
        message: "🔴 Світло зникло",
        createdAt: new Date(),
      },
    ],
  },
];

const locationsCollection = isFirebaseConfigured
  ? firestore.collection("locations")
  : null;
const eventsCollection = isFirebaseConfigured
  ? firestore.collection("events")
  : null;

function mapLocationDoc(id: string, data: FirestoreLocationDoc): Location {
  return {
    id: Number(id),
    number: data.number ?? null,
    address: data.address,
    currentStatusRaw: data.currentStatusRaw ?? null,
    group: data.group ?? null,
    channelName: data.channelName ?? null,
    url: data.url,
    lastScrapedAt: data.lastScrapedAt ? new Date(data.lastScrapedAt) : null,
  };
}

function mapEventDoc(id: string, data: FirestoreEventDoc): Event {
  return {
    id: Number(id),
    locationId: data.locationId,
    timestamp: new Date(data.timestamp),
    isLightOn: data.isLightOn,
    message: data.message,
    createdAt: data.createdAt ? new Date(data.createdAt) : null,
  };
}

async function getNextId(
  collection: FirebaseFirestore.CollectionReference
): Promise<number> {
  const counterRef = firestore.collection("counters").doc(collection.id);
  const result = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const nextId = (snapshot.data()?.value ?? 0) + 1;
    transaction.set(counterRef, { value: nextId }, { merge: true });
    return nextId;
  });
  return result;
}

export const storage = {
  async getLocations(): Promise<LocationWithEvents[]> {
    if (!isFirebaseConfigured || !locationsCollection) {
      return demoLocations;
    }

    const snapshot = await locationsCollection.orderBy("number", "asc").get();
    const results: LocationWithEvents[] = [];

    for (const doc of snapshot.docs) {
      const location = mapLocationDoc(
        doc.id,
        doc.data() as FirestoreLocationDoc
      );
      const locEvents = await this.getEventsByLocation(location.id);
      results.push({ ...location, events: locEvents });
    }

    return results;
  },

  async getLocation(id: number): Promise<LocationWithEvents | undefined> {
    if (!isFirebaseConfigured || !locationsCollection) {
      return demoLocations.find((l) => l.id === id);
    }

    const doc = await locationsCollection.doc(String(id)).get();
    if (!doc.exists) return undefined;
    const location = mapLocationDoc(doc.id, doc.data() as FirestoreLocationDoc);
    const locEvents = await this.getEventsByLocation(id);
    return { ...location, events: locEvents };
  },

  async createLocation(location: InsertLocation): Promise<Location> {
    if (!isFirebaseConfigured || !locationsCollection) {
      throw new Error("Firebase not configured - cannot create location");
    }

    const id = await getNextId(locationsCollection);
    const payload: FirestoreLocationDoc = {
      number: location.number ?? null,
      address: location.address,
      currentStatusRaw: location.currentStatusRaw ?? null,
      group: location.group ?? null,
      channelName: location.channelName ?? null,
      url: location.url,
      lastScrapedAt: null,
    };
    await locationsCollection.doc(String(id)).set(payload);
    return mapLocationDoc(String(id), payload);
  },

  async updateLocationStatus(
    id: number,
    status: string,
    lastScraped: Date
  ): Promise<Location> {
    if (!isFirebaseConfigured || !locationsCollection) {
      throw new Error("Firebase not configured - cannot update location");
    }

    const docRef = locationsCollection.doc(String(id));
    await docRef.set(
      {
        currentStatusRaw: status,
        lastScrapedAt: lastScraped.toISOString(),
      },
      { merge: true }
    );
    const updated = await docRef.get();
    return mapLocationDoc(String(id), updated.data() as FirestoreLocationDoc);
  },

  async getEventsByLocation(locationId: number): Promise<Event[]> {
    if (!isFirebaseConfigured || !eventsCollection) {
      const loc = demoLocations.find((l) => l.id === locationId);
      return loc?.events ?? [];
    }

    const snapshot = await eventsCollection
      .where("locationId", "==", locationId)
      .orderBy("timestamp", "desc")
      .get();
    return snapshot.docs.map((doc) =>
      mapEventDoc(doc.id, doc.data() as FirestoreEventDoc)
    );
  },

  async createEvent(event: InsertEvent): Promise<Event> {
    if (!isFirebaseConfigured || !eventsCollection) {
      throw new Error("Firebase not configured - cannot create event");
    }

    const id = await getNextId(eventsCollection);
    const payload: FirestoreEventDoc = {
      locationId: event.locationId,
      timestamp: event.timestamp.toISOString(),
      isLightOn: event.isLightOn,
      message: event.message,
      createdAt: new Date().toISOString(),
    };
    await eventsCollection.doc(String(id)).set(payload);
    return mapEventDoc(String(id), payload);
  },

  async getLastEvent(locationId: number): Promise<Event | undefined> {
    if (!isFirebaseConfigured || !eventsCollection) {
      const loc = demoLocations.find((l) => l.id === locationId);
      return loc?.events?.[0];
    }

    const snapshot = await eventsCollection
      .where("locationId", "==", locationId)
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    return doc ? mapEventDoc(doc.id, doc.data() as FirestoreEventDoc) : undefined;
  },
};

// Types for Firestore documents and API responses

export interface Location {
    id: number;
    number: number | null;
    address: string;
    currentStatusRaw: string | null;
    group: string | null;
    channelName: string | null;
    url: string;
    lastScrapedAt: Date | null;
  }
  
  export interface Event {
    id: number;
    locationId: number;
    timestamp: Date;
    isLightOn: boolean;
    message: string;
    createdAt: Date | null;
  }
  
  export interface LocationWithEvents extends Location {
    events: Event[];
  }
  
  export interface InsertLocation {
    number?: number | null;
    address: string;
    currentStatusRaw?: string | null;
    group?: string | null;
    channelName?: string | null;
    url: string;
  }
  
  export interface InsertEvent {
    locationId: number;
    timestamp: Date;
    isLightOn: boolean;
    message: string;
  }
  
  export interface ScrapeResult {
    success: boolean;
    message: string;
    newEventsCount: number;
  }
  
  // Firestore document types (dates stored as ISO strings)
  export type FirestoreLocationDoc = Omit<Location, "id" | "lastScrapedAt"> & {
    lastScrapedAt?: string | null;
  };
  
  export type FirestoreEventDoc = Omit<Event, "id" | "timestamp" | "createdAt"> & {
    timestamp: string;
    createdAt?: string | null;
  };
  