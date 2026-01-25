import * as cheerio from "cheerio";
import axios from "axios";
import { storage } from "./storage";
import type { InsertLocation, LocationWithEvents } from "./types";

export function parseInitialFile(content: string): InsertLocation[] {
  const lines = content.split("\n");
  const locations: InsertLocation[] = [];

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

    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 7) continue;

    const numberStr = parts[1];
    const address = parts[2].replace(/\*\*/g, "");

    if (address === "Адреса" || address === ":---") continue;

    const currentStatusRaw = parts[3];
    const group = parts[4] === "—" ? null : parts[4];
    const channelName = parts[5];

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

export async function scrapeLocation(location: LocationWithEvents) {
  console.log(`Scraping ${location.address} (${location.url})...`);

  let html = "";
  try {
    const response = await axios.get(location.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    html = response.data;
  } catch (error) {
    console.error(`Failed to fetch ${location.url}:`, error);
    return { success: false, message: "Failed to fetch URL", newEventsCount: 0 };
  }

  const $ = cheerio.load(html);
  const messages = $(".tgme_widget_message");
  let newEventsCount = 0;

  const existingEvents = await storage.getEventsByLocation(location.id);
  const existingTimestamps = new Set(existingEvents.map((event) => event.timestamp.getTime()));

  for (let i = 0; i < messages.length; i++) {
    const el = messages[i];
    const $el = $(el);

    const textContent = $el.find(".tgme_widget_message_text").text();
    const dateStr = $el.find(".tgme_widget_message_date time").attr("datetime");

    if (!textContent || !dateStr) continue;

    const hasRed = textContent.includes("🔴");
    const hasGreen = textContent.includes("🟢");

    if (!hasRed && !hasGreen) continue;

    const timestamp = new Date(dateStr);

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    if (timestamp < tenDaysAgo) continue;

    if (existingTimestamps.has(timestamp.getTime())) continue;

    const isLightOn = hasGreen;

    await storage.createEvent({
      locationId: location.id,
      timestamp,
      isLightOn,
      message: textContent,
    });

    newEventsCount++;
  }

  await storage.updateLocationStatus(location.id, location.currentStatusRaw || "", new Date());

  return { success: true, message: "Scraped successfully", newEventsCount };
}
