import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_lib/cors";
import { firestore, isFirebaseConfigured } from "./_lib/firebase";

// Hardcoded seed data
const seedLocations = [
  {
    number: 1,
    address: "Львівська 22-А",
    currentStatusRaw: "Є вже 1год 16хв",
    group: "Група 3.2",
    channelName: "@svitlobot_kyiv_lvivska_22a",
    url: "https://t.me/s/svitlobot_kyiv_lvivska_22a",
  },
  {
    number: 2,
    address: "Берестейський 109А",
    currentStatusRaw: "Є вже 5год 23хв",
    group: "Група 3.2",
    channelName: "@svitlobot_gkverhovyna",
    url: "https://t.me/s/svitlobot_gkverhovyna",
  },
  {
    number: 3,
    address: "Анатолія Петрицького 13",
    currentStatusRaw: "Є вже 8год 17хв",
    group: null,
    channelName: "@svitlobot_vidpochinok",
    url: "https://t.me/s/svitlobot_vidpochinok",
  },
  {
    number: 4,
    address: "Верховинна 81",
    currentStatusRaw: "Немає вже 11год 37хв",
    group: null,
    channelName: "@svitlobot_verhovunna_81",
    url: "https://t.me/s/svitlobot_verhovunna_81",
  },
  {
    number: 5,
    address: "Мирослава Поповича 16",
    currentStatusRaw: "Немає вже 4год 54хв",
    group: null,
    channelName: "@svitlobot_semashka16",
    url: "https://t.me/s/svitlobot_semashka16",
  },
  {
    number: 6,
    address: "Васкула, 8",
    currentStatusRaw: "Немає вже 15год 57хв",
    group: null,
    channelName: "@svitlobot_vaskula",
    url: "https://t.me/s/svitlobot_vaskula",
  },
  {
    number: 7,
    address: "Василя Стуса 7Б",
    currentStatusRaw: "Є вже 8год 8хв",
    group: "Група 6.2",
    channelName: "@svitlobot_stusa7b",
    url: "https://t.me/s/svitlobot_stusa7b",
  },
  {
    number: 8,
    address: "Львівська 22",
    currentStatusRaw: "Є вже 6год 41хв",
    group: null,
    channelName: "@svitlobot_levenia",
    url: "https://t.me/s/svitlobot_levenia",
  },
  {
    number: 9,
    address: "Гетьмана Кирила Розумовського 19",
    currentStatusRaw: "Немає вже 11год 37хв",
    group: "Група 3.2",
    channelName: "@svitlobot_rozymovskogo19",
    url: "https://t.me/s/svitlobot_rozymovskogo19",
  },
  {
    number: 10,
    address: "Депутатська 17/6",
    currentStatusRaw: "Немає вже 11год 37хв",
    group: null,
    channelName: "@svitlobot_kyiiv_deputatska_17",
    url: "https://t.me/s/svitlobot_kyiiv_deputatska_17",
  },
  {
    number: 11,
    address: "Депутатська 23А",
    currentStatusRaw: "Немає вже 11год 39хв",
    group: null,
    channelName: "@svitlobot_deputatska23a",
    url: "https://t.me/s/svitlobot_deputatska23a",
  },
  {
    number: 12,
    address: "Чорнобильська 12",
    currentStatusRaw: "Немає вже 4год 55хв",
    group: null,
    channelName: "@svitlobot_chorn12",
    url: "https://t.me/s/svitlobot_chorn12",
  },
  {
    number: 13,
    address: "Ірпінська 74",
    currentStatusRaw: "Немає вже 4год 52хв",
    group: null,
    channelName: "@svitlobot_irpinska_74",
    url: "https://t.me/s/svitlobot_irpinska_74",
  },
  {
    number: 14,
    address: "пр-т Палладіна 7/60",
    currentStatusRaw: "Немає вже 4год 27хв",
    group: null,
    channelName: "@svitlobot_Akadem760",
    url: "https://t.me/s/svitlobot_Akadem760",
  },
  {
    number: 15,
    address: "Ірпінська 69Б",
    currentStatusRaw: "Немає вже 6год 43хв",
    group: null,
    channelName: "@svitlobot_irpinska_69b",
    url: "https://t.me/s/svitlobot_irpinska_69b",
  },
  {
    number: 16,
    address: "Ірпінська 69А",
    currentStatusRaw: "Немає вже 4год 55хв",
    group: null,
    channelName: "@svitlobot_irpinska_69a",
    url: "https://t.me/s/svitlobot_irpinska_69a",
  },
  {
    number: 17,
    address: "пл. Святошинська 1",
    currentStatusRaw: "Є вже 7год 36хв",
    group: null,
    channelName: "@svitlobot_pl_Svyatoshynska_1",
    url: "https://t.me/s/svitlobot_pl_Svyatoshynska_1",
  },
  {
    number: 18,
    address: "Берестейський 121-Б",
    currentStatusRaw: "Немає вже 11год 39хв",
    group: null,
    channelName: "@svitlobot_beresteiskyi121",
    url: "https://t.me/s/svitlobot_beresteiskyi121",
  },
];

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!isFirebaseConfigured) {
    return res.status(503).json({
      success: false,
      message: "Firebase not configured. Cannot seed database in demo mode.",
    });
  }

  try {
    const locationsCollection = firestore.collection("locations");
    const countersCollection = firestore.collection("counters");

    // Check if already seeded
    const existingDocs = await locationsCollection.limit(1).get();
    if (!existingDocs.empty) {
      return res.status(200).json({
        success: true,
        message: "Database already seeded. Skipping.",
        count: 0,
      });
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
      count++;
    }

    // Update counter
    await countersCollection.doc("locations").set({
      value: seedLocations.length,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully seeded ${count} locations`,
      count,
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to seed database",
    });
  }
}
