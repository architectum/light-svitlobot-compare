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
    return res.status(200).json(locations);
  } catch (error: any) {
    console.error("Error fetching locations:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}
