/**
 * Seed script for populating Firestore with initial location data.
 * 
 * Usage:
 *   npx tsx script/seed.ts
 * 
 * Make sure you have Firebase credentials set in .env:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 */

import admin from "firebase-admin";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ Firebase credentials not found!");
  console.error("   Please set these environment variables in .env:");
  console.error("   - FIREBASE_PROJECT_ID");
  console.error("   - FIREBASE_CLIENT_EMAIL");
  console.error("   - FIREBASE_PRIVATE_KEY");
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

const firestore = admin.firestore();

// Hardcoded seed data - Берестейський 121-Б (№18) is the reference location
const seedLocations = [
  { number: 1, address: "Львівська 22-А", currentStatusRaw: " ", group: "Група 3.2", channelName: "@svitlobot_kyiv_lvivska_22a", url: "https://t.me/s/svitlobot_kyiv_lvivska_22a" },
  { number: 2, address: "Берестейський 109А", currentStatusRaw: " ", group: "Група 3.2", channelName: "@svitlobot_gkverhovyna", url: "https://t.me/s/svitlobot_gkverhovyna" },
  { number: 3, address: "Анатолія Петрицького 13", currentStatusRaw: " ", group: null, channelName: "@svitlobot_vidpochinok", url: "https://t.me/s/svitlobot_vidpochinok" },
  { number: 4, address: "Верховинна 81", currentStatusRaw: " ", group: null, channelName: "@svitlobot_verhovunna_81", url: "https://t.me/s/svitlobot_verhovunna_81" },
  { number: 5, address: "Мирослава Поповича 16", currentStatusRaw: " ", group: null, channelName: "@svitlobot_semashka16", url: "https://t.me/s/svitlobot_semashka16" },
  { number: 6, address: "Васкула, 8", currentStatusRaw: " ", group: null, channelName: "@svitlobot_vaskula", url: "https://t.me/s/svitlobot_vaskula" },
  { number: 7, address: "Василя Стуса 7Б", currentStatusRaw: " ", group: "Група 6.2", channelName: "@svitlobot_stusa7b", url: "https://t.me/s/svitlobot_stusa7b" },
  { number: 8, address: "Львівська 22", currentStatusRaw: " ", group: null, channelName: "@svitlobot_levenia", url: "https://t.me/s/svitlobot_levenia" },
  { number: 9, address: "Гетьмана Кирила Розумовського 19", currentStatusRaw: " ", group: "Група 3.2", channelName: "@svitlobot_rozymovskogo19", url: "https://t.me/s/svitlobot_rozymovskogo19" },
  { number: 10, address: "Депутатська 17/6", currentStatusRaw: " ", group: null, channelName: "@svitlobot_kyiiv_deputatska_17", url: "https://t.me/s/svitlobot_kyiiv_deputatska_17" },
  { number: 11, address: "Депутатська 23А", currentStatusRaw: " ", group: null, channelName: "@svitlobot_deputatska23a", url: "https://t.me/s/svitlobot_deputatska23a" },
  { number: 12, address: "Чорнобильська 12", currentStatusRaw: " ", group: null, channelName: "@svitlobot_chorn12", url: "https://t.me/s/svitlobot_chorn12" },
  { number: 13, address: "Ірпінська 74", currentStatusRaw: " ", group: null, channelName: "@svitlobot_irpinska_74", url: "https://t.me/s/svitlobot_irpinska_74" },
  { number: 14, address: "пр-т Палладіна 7/60", currentStatusRaw: " ", group: null, channelName: "@svitlobot_Akadem760", url: "https://t.me/s/svitlobot_Akadem760" },
  { number: 15, address: "Ірпінська 69Б", currentStatusRaw: " ", group: null, channelName: "@svitlobot_irpinska_69b", url: "https://t.me/s/svitlobot_irpinska_69b" },
  { number: 16, address: "Ірпінська 69А", currentStatusRaw: " ", group: null, channelName: "@svitlobot_irpinska_69a", url: "https://t.me/s/svitlobot_irpinska_69a" },
  { number: 17, address: "пл. Святошинська 1", currentStatusRaw: " ", group: null, channelName: "@svitlobot_pl_Svyatoshynska_1", url: "https://t.me/s/svitlobot_pl_Svyatoshynska_1" },
  { number: 18, address: "Берестейський 121-Б", currentStatusRaw: " ", group: null, channelName: "@svitlobot_beresteiskyi121", url: "https://t.me/s/svitlobot_beresteiskyi121" },
];

async function seed() {
  console.log("🌱 Starting database seed...\n");

  const locationsCollection = firestore.collection("locations");
  const countersCollection = firestore.collection("counters");

  // Check if already seeded
  const existingDocs = await locationsCollection.limit(1).get();
  if (!existingDocs.empty) {
    console.log("⚠️  Database already has data. Skipping seed.");
    console.log("   To re-seed, first delete the 'locations' collection in Firebase Console.");
    process.exit(0);
  }

  // Seed locations
  let count = 0;
  for (const loc of seedLocations) {
    const id = loc.number;
    await locationsCollection.doc(String(id)).set({
      number: loc.number,
      address: loc.address,
      currentStatusRaw: loc.currentStatusRaw,
      group: loc.group,
      channelName: loc.channelName,
      url: loc.url,
      lastScrapedAt: null,
    });
    console.log(`  ✓ Added: ${loc.address}`);
    count++;
  }

  // Update counter
  await countersCollection.doc("locations").set({
    value: seedLocations.length,
  });

  console.log(`\n✅ Successfully seeded ${count} locations!`);
  console.log("   Reference location: Берестейський 121-Б (№18)");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
