import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "../../_lib/cors.js";
import { storage } from "../../_lib/storage.js";
import { scrapeLocation } from "../../_lib/scraper.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;
  const locationId = Number(id);

  if (isNaN(locationId)) {
    return res.status(400).json({ message: "Invalid location ID" });
  }

  try {
    const location = await storage.getLocation(locationId);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    const result = await scrapeLocation(location);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Scan error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}
