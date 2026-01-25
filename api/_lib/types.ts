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
