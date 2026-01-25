import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { parseInitialFile, scrapeLocation } from "./scraper";
import { isFirebaseConfigured } from "./firebase";

// Hardcoded seed data
const seedLocations = [
  { number: 1, address: "Львівська 22-А", currentStatusRaw: "Є вже 1год 16хв", group: "Група 3.2", channelName: "@svitlobot_kyiv_lvivska_22a", url: "https://t.me/s/svitlobot_kyiv_lvivska_22a" },
  { number: 2, address: "Берестейський 109А", currentStatusRaw: "Є вже 5год 23хв", group: "Група 3.2", channelName: "@svitlobot_gkverhovyna", url: "https://t.me/s/svitlobot_gkverhovyna" },
  { number: 3, address: "Анатолія Петрицького 13", currentStatusRaw: "Є вже 8год 17хв", group: null, channelName: "@svitlobot_vidpochinok", url: "https://t.me/s/svitlobot_vidpochinok" },
  { number: 4, address: "Верховинна 81", currentStatusRaw: "Немає вже 11год 37хв", group: null, channelName: "@svitlobot_verhovunna_81", url: "https://t.me/s/svitlobot_verhovunna_81" },
  { number: 5, address: "Мирослава Поповича 16", currentStatusRaw: "Немає вже 4год 54хв", group: null, channelName: "@svitlobot_semashka16", url: "https://t.me/s/svitlobot_semashka16" },
  { number: 6, address: "Васкула, 8", currentStatusRaw: "Немає вже 15год 57хв", group: null, channelName: "@svitlobot_vaskula", url: "https://t.me/s/svitlobot_vaskula" },
  { number: 7, address: "Василя Стуса 7Б", currentStatusRaw: "Є вже 8год 8хв", group: "Група 6.2", channelName: "@svitlobot_stusa7b", url: "https://t.me/s/svitlobot_stusa7b" },
  { number: 8, address: "Львівська 22", currentStatusRaw: "Є вже 6год 41хв", group: null, channelName: "@svitlobot_levenia", url: "https://t.me/s/svitlobot_levenia" },
  { number: 9, address: "Гетьмана Кирила Розумовського 19", currentStatusRaw: "Немає вже 11год 37хв", group: "Група 3.2", channelName: "@svitlobot_rozymovskogo19", url: "https://t.me/s/svitlobot_rozymovskogo19" },
  { number: 10, address: "Депутатська 17/6", currentStatusRaw: "Немає вже 11год 37хв", group: null, channelName: "@svitlobot_kyiiv_deputatska_17", url: "https://t.me/s/svitlobot_kyiiv_deputatska_17" },
  { number: 11, address: "Депутатська 23А", currentStatusRaw: "Немає вже 11год 39хв", group: null, channelName: "@svitlobot_deputatska23a", url: "https://t.me/s/svitlobot_deputatska23a" },
  { number: 12, address: "Чорнобильська 12", currentStatusRaw: "Немає вже 4год 55хв", group: null, channelName: "@svitlobot_chorn12", url: "https://t.me/s/svitlobot_chorn12" },
  { number: 13, address: "Ірпінська 74", currentStatusRaw: "Немає вже 4год 52хв", group: null, channelName: "@svitlobot_irpinska_74", url: "https://t.me/s/svitlobot_irpinska_74" },
  { number: 14, address: "пр-т Палладіна 7/60", currentStatusRaw: "Немає вже 4год 27хв", group: null, channelName: "@svitlobot_Akadem760", url: "https://t.me/s/svitlobot_Akadem760" },
  { number: 15, address: "Ірпінська 69Б", currentStatusRaw: "Немає вже 6год 43хв", group: null, channelName: "@svitlobot_irpinska_69b", url: "https://t.me/s/svitlobot_irpinska_69b" },
  { number: 16, address: "Ірпінська 69А", currentStatusRaw: "Немає вже 4год 55хв", group: null, channelName: "@svitlobot_irpinska_69a", url: "https://t.me/s/svitlobot_irpinska_69a" },
  { number: 17, address: "пл. Святошинська 1", currentStatusRaw: "Є вже 7год 36хв", group: null, channelName: "@svitlobot_pl_Svyatoshynska_1", url: "https://t.me/s/svitlobot_pl_Svyatoshynska_1" },
  { number: 18, address: "Берестейський 121-Б", currentStatusRaw: "Немає вже 11год 39хв", group: null, channelName: "@svitlobot_beresteiskyi121", url: "https://t.me/s/svitlobot_beresteiskyi121" },
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed data if empty
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

  app.get(api.locations.list.path, async (req, res) => {
    const locations = await storage.getLocations();
    res.json(locations);
  });

  app.get(api.locations.get.path, async (req, res) => {
    const location = await storage.getLocation(Number(req.params.id));
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }
    res.json(location);
  });

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

  app.get(api.locations.downloadAll.path, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=all_locations.json');
      res.send(JSON.stringify(locations, null, 2));
    } catch (error: any) {
      res.status(500).json({ message: "Failed to generate JSON" });
    }
  });

  app.get(api.locations.downloadOne.path, async (req, res) => {
    try {
      const location = await storage.getLocation(Number(req.params.id));
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=location_${location.id}.json`);
      res.send(JSON.stringify(location, null, 2));
    } catch (error: any) {
      res.status(500).json({ message: "Failed to generate JSON" });
    }
  });

  app.get(api.locations.charts.path, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch chart data" });
    }
  });

  // Seed endpoint - GET /api/seed
  app.get("/api/seed", async (req, res) => {
    if (!isFirebaseConfigured) {
      return res.status(503).json({
        success: false,
        message: "Firebase not configured. Cannot seed database in demo mode.",
      });
    }

    try {
      // Check if already seeded
      const existingLocations = await storage.getLocations();
      if (existingLocations.length > 0) {
        return res.json({
          success: true,
          message: "Database already seeded. Skipping.",
          count: 0,
        });
      }

      // Seed locations
      let count = 0;
      for (const loc of seedLocations) {
        await storage.createLocation(loc);
        count++;
      }

      res.json({
        success: true,
        message: `Successfully seeded ${count} locations`,
        count,
      });
    } catch (error: any) {
      console.error("Seed error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to seed database",
      });
    }
  });

  return httpServer;
}
