import { firestore } from "./firebase";
import type {
  Event,
  InsertEvent,
  InsertLocation,
  Location,
  LocationWithEvents,
} from "./types";

export interface IStorage {
  getLocations(): Promise<LocationWithEvents[]>;
  getLocation(id: number): Promise<LocationWithEvents | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocationStatus(id: number, status: string, lastScraped: Date): Promise<Location>;
  getEventsByLocation(locationId: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  getLastEvent(locationId: number): Promise<Event | undefined>;
}

type FirestoreLocationDoc = Omit<Location, "id" | "lastScrapedAt"> & {
  lastScrapedAt?: string | null;
};

type FirestoreEventDoc = Omit<Event, "id" | "timestamp" | "createdAt"> & {
  timestamp: string;
  createdAt?: string | null;
};

const locationsCollection = firestore.collection("locations");
const eventsCollection = firestore.collection("events");

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

async function getNextId(collection: FirebaseFirestore.CollectionReference) {
  const counterRef = firestore.collection("counters").doc(collection.id);
  const result = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const nextId = (snapshot.data()?.value ?? 0) + 1;
    transaction.set(counterRef, { value: nextId }, { merge: true });
    return nextId;
  });
  return result;
}

export class FirestoreStorage implements IStorage {
  async getLocations(): Promise<LocationWithEvents[]> {
    const snapshot = await locationsCollection.orderBy("number", "asc").get();
    const results: LocationWithEvents[] = [];

    for (const doc of snapshot.docs) {
      const location = mapLocationDoc(doc.id, doc.data() as FirestoreLocationDoc);
      const locEvents = await this.getEventsByLocation(location.id);
      results.push({ ...location, events: locEvents });
    }

    return results;
  }

  async getLocation(id: number): Promise<LocationWithEvents | undefined> {
    const doc = await locationsCollection.doc(String(id)).get();
    if (!doc.exists) return undefined;
    const location = mapLocationDoc(doc.id, doc.data() as FirestoreLocationDoc);
    const locEvents = await this.getEventsByLocation(id);
    return { ...location, events: locEvents };
  }

  async createLocation(location: InsertLocation): Promise<Location> {
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
  }

  async updateLocationStatus(id: number, status: string, lastScraped: Date): Promise<Location> {
    const docRef = locationsCollection.doc(String(id));
    await docRef.set(
      {
        currentStatusRaw: status,
        lastScrapedAt: lastScraped.toISOString(),
      },
      { merge: true },
    );
    const updated = await docRef.get();
    return mapLocationDoc(String(id), updated.data() as FirestoreLocationDoc);
  }

  async getEventsByLocation(locationId: number): Promise<Event[]> {
    const snapshot = await eventsCollection
      .where("locationId", "==", locationId)
      .orderBy("timestamp", "desc")
      .get();
    return snapshot.docs.map((doc) => mapEventDoc(doc.id, doc.data() as FirestoreEventDoc));
  }

  async createEvent(event: InsertEvent): Promise<Event> {
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
  }

  async getLastEvent(locationId: number): Promise<Event | undefined> {
    const snapshot = await eventsCollection
      .where("locationId", "==", locationId)
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    return doc ? mapEventDoc(doc.id, doc.data() as FirestoreEventDoc) : undefined;
  }
}

export const storage = new FirestoreStorage();
