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

  try {
    const locations = await storage.getLocations();
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=all_locations.json"
    );
    return res.status(200).send(JSON.stringify(locations, null, 2));
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to generate JSON" });
  }
}
