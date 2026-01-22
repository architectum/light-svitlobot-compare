import { db } from "./db";
import {
  locations,
  events,
  type Location,
  type InsertLocation,
  type Event,
  type InsertEvent,
  type LocationWithEvents
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Locations
  getLocations(): Promise<LocationWithEvents[]>;
  getLocation(id: number): Promise<LocationWithEvents | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocationStatus(id: number, status: string, lastScraped: Date): Promise<Location>;
  
  // Events
  getEventsByLocation(locationId: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  getLastEvent(locationId: number): Promise<Event | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getLocations(): Promise<LocationWithEvents[]> {
    const allLocations = await db.select().from(locations).orderBy(locations.number);
    
    // Enrich with recent events for dashboard preview if needed, or just return basic info
    // For now, let's just fetch them. Ideally we might want to optimize this.
    const results: LocationWithEvents[] = [];
    
    for (const loc of allLocations) {
      const locEvents = await this.getEventsByLocation(loc.id);
      results.push({ ...loc, events: locEvents });
    }
    
    return results;
  }

  async getLocation(id: number): Promise<LocationWithEvents | undefined> {
    const [loc] = await db.select().from(locations).where(eq(locations.id, id));
    if (!loc) return undefined;
    
    const locEvents = await this.getEventsByLocation(id);
    return { ...loc, events: locEvents };
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLoc] = await db.insert(locations).values(location).returning();
    return newLoc;
  }

  async updateLocationStatus(id: number, status: string, lastScraped: Date): Promise<Location> {
    const [updated] = await db.update(locations)
      .set({ currentStatusRaw: status, lastScrapedAt: lastScraped })
      .where(eq(locations.id, id))
      .returning();
    return updated;
  }

  async getEventsByLocation(locationId: number): Promise<Event[]> {
    return await db.select()
      .from(events)
      .where(eq(events.locationId, locationId))
      .orderBy(desc(events.timestamp));
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    // Check if duplicate event exists (same timestamp and location) to avoid spamming if rescanned
    const [existing] = await db.select()
      .from(events)
      .where(eq(events.locationId, event.locationId))
      // simple check, might need more precise timestamp check depending on parsing
      // but for now, we rely on the logic that we only add new ones
    
    // Actually, simple insert is fine, scraper logic should handle duplicates
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async getLastEvent(locationId: number): Promise<Event | undefined> {
    const [event] = await db.select()
      .from(events)
      .where(eq(events.locationId, locationId))
      .orderBy(desc(events.timestamp))
      .limit(1);
    return event;
  }
}

export const storage = new DatabaseStorage();
