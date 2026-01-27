import * as cheerio from "cheerio";
import axios from "axios";
import { storage } from "./storage.js";
import type { LocationWithEvents, InsertLocation, ScrapeResult } from "./types.js";

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
