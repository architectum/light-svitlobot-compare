import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "../_lib/cors";
import { storage } from "../_lib/storage";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
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
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=location_${location.id}.json`
    );
    return res.status(200).send(JSON.stringify(location, null, 2));
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to generate JSON" });
  }
}
