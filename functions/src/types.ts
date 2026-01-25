export type Location = {
  id: number;
  number: number | null;
  address: string;
  currentStatusRaw: string | null;
  group: string | null;
  channelName: string | null;
  url: string;
  lastScrapedAt: Date | null;
};

export type Event = {
  id: number;
  locationId: number;
  timestamp: Date;
  isLightOn: boolean;
  message: string;
  createdAt: Date | null;
};

export type LocationWithEvents = Location & { events: Event[] };

export type InsertLocation = Omit<Location, "id" | "lastScrapedAt"> & {
  lastScrapedAt?: Date | null;
};

export type InsertEvent = Omit<Event, "id" | "createdAt">;

export type ScrapeResult = {
  success: boolean;
  message: string;
  newEventsCount: number;
};
