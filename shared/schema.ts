import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

// Locations from the provided table
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  number: integer("number"), // The "№" column
  address: text("address").notNull(),
  currentStatusRaw: text("current_status_raw"), // Text like "Є вже 1год 16хв"
  group: text("group"),
  channelName: text("channel_name"), // e.g., @svitlobot_kyiv_lvivska_22a
  url: text("url").notNull(), // Link to view
  lastScrapedAt: timestamp("last_scraped_at"),
});

// Outage events extracted from Telegram
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  isLightOn: boolean("is_light_on").notNull(), // true = 🟢, false = 🔴
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const locationsRelations = relations(locations, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  location: one(locations, {
    fields: [events.locationId],
    references: [locations.id],
  }),
}));

// === SCHEMAS ===
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, lastScrapedAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });

// === TYPES ===
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type LocationWithEvents = Location & { events: Event[] };

// API Types
export type ScrapeResult = {
  success: boolean;
  message: string;
  newEventsCount: number;
};
