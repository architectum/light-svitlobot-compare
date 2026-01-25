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
    return res.status(200).json(location);
  } catch (error: any) {
    console.error("Error fetching location:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}
