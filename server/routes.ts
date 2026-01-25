import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { parseInitialFile, scrapeLocation } from "./scraper";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed data if empty (from file for backward compatibility)
  const locations = await storage.getLocations();
  if (locations.length === 0) {
    try {
      const filePath = path.join(process.cwd(), "attached_assets", "Pasted---1769113607418_1769113607420.txt");
      if (fs.existsSync(filePath)) {
        console.log("Seeding database from file...");
        const content = fs.readFileSync(filePath, "utf-8");
        const parsedLocations = parseInitialFile(content);
        
        for (const loc of parsedLocations) {
          await storage.createLocation(loc);
        }
        console.log(`Seeded ${parsedLocations.length} locations.`);
      }
    } catch (e) {
      console.error("Failed to seed database:", e);
    }
  }

  // === API Routes ===

  app.post(api.locations.scan.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const location = await storage.getLocation(id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      const result = await scrapeLocation(location);
      res.json(result);
    } catch (error: any) {
      console.error("Scan error:", error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  app.post(api.locations.scanAll.path, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      let totalNewEvents = 0;
      
      // Run sequentially to avoid rate limits or overwhelming
      for (const location of locations) {
        try {
          const result = await scrapeLocation(location);
          totalNewEvents += result.newEventsCount;
        } catch (e) {
          console.error(`Failed to scan location ${location.id}:`, e);
          // Continue with others
        }
      }

      res.json({
        success: true,
        message: `Scanned ${locations.length} locations`,
        totalNewEvents
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  return httpServer;
}
