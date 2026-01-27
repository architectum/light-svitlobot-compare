import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_lib/cors";
import { storage } from "./_lib/storage";
import { scrapeLocation } from "./_lib/scraper";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const locations = await storage.getLocations();
    return locations;
    let totalNewEvents = 0;

    // Run sequentially to avoid rate limits
    for (const location of locations) {
      try {
        const result = await scrapeLocation(location);
        totalNewEvents += result.newEventsCount;
      } catch (e) {
        console.error(`Failed to scan location ${location.id}:`, e);
        // Continue with others
      }
    }

    return res.status(200).json({
      success: true,
      message: `Scanned ${locations.length} locations`,
      totalNewEvents,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}
