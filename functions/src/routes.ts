import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { parseInitialFile, scrapeLocation } from "./scraper";
import type { LocationWithEvents } from "./types";
import * as fs from "fs";
import * as path from "path";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const locations = await storage.getLocations();
  if (locations.length === 0) {
    try {
      const filePath = path.resolve(
        __dirname,
        "..",
        "attached_assets",
        "Pasted---1769113607418_1769113607420.txt",
      );
      if (fs.existsSync(filePath)) {
        console.log("Seeding database from file...");
        const content = fs.readFileSync(filePath, "utf-8");
        const parsedLocations = parseInitialFile(content);

        for (const loc of parsedLocations) {
          await storage.createLocation(loc);
        }
        console.log(`Seeded ${parsedLocations.length} locations.`);
      }
    } catch (error) {
      console.error("Failed to seed database:", error);
    }
  }

  app.get("/api/locations", async (_req, res) => {
    const results = await storage.getLocations();
    res.json(results);
  });

  app.get("/api/locations/:id", async (req, res) => {
    const location = await storage.getLocation(Number(req.params.id));
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }
    res.json(location);
  });

  app.post("/api/locations/:id/scan", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const location = await storage.getLocation(id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      const result = await scrapeLocation(location as LocationWithEvents);
      res.json(result);
    } catch (error: any) {
      console.error("Scan error:", error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  app.post("/api/scan-all", async (_req, res) => {
    try {
      const allLocations = await storage.getLocations();
      let totalNewEvents = 0;

      for (const location of allLocations) {
        try {
          const result = await scrapeLocation(location as LocationWithEvents);
          totalNewEvents += result.newEventsCount;
        } catch (error) {
          console.error(`Failed to scan location ${location.id}:`, error);
        }
      }

      res.json({
        success: true,
        message: `Scanned ${allLocations.length} locations`,
        totalNewEvents,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  app.get("/api/download/all", async (_req, res) => {
    try {
      const allLocations = await storage.getLocations();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=all_locations.json");
      res.send(JSON.stringify(allLocations, null, 2));
    } catch (error: any) {
      res.status(500).json({ message: "Failed to generate JSON" });
    }
  });

  app.get("/api/download/:id", async (req, res) => {
    try {
      const location = await storage.getLocation(Number(req.params.id));
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=location_${location.id}.json`,
      );
      res.send(JSON.stringify(location, null, 2));
    } catch (error: any) {
      res.status(500).json({ message: "Failed to generate JSON" });
    }
  });

  app.get("/api/charts-data", async (_req, res) => {
    try {
      const results = await storage.getLocations();
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch chart data" });
    }
  });

  return httpServer;
}
