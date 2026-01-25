import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, where, orderBy } from "firebase/firestore";
import type { LocationWithEvents, Location, Event } from "@shared/schema";

// Helper to map Firestore docs to types
const mapLocation = (id: string, data: any): Location => ({
  id: Number(id),
  number: data.number ?? null,
  address: data.address,
  currentStatusRaw: data.currentStatusRaw ?? null,
  group: data.group ?? null,
  channelName: data.channelName ?? null,
  url: data.url,
  lastScrapedAt: data.lastScrapedAt ? new Date(data.lastScrapedAt) : null,
});

const mapEvent = (id: string, data: any): Event => ({
  id: Number(id),
  locationId: data.locationId,
  timestamp: new Date(data.timestamp),
  isLightOn: data.isLightOn,
  message: data.message,
  createdAt: data.createdAt ? new Date(data.createdAt) : null,
});

export type { LocationWithEvents };

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const locationsRef = collection(db, "locations");
      const snapshot = await getDocs(query(locationsRef, orderBy("number", "asc")));
      
      const locations = snapshot.docs.map(docSnap => mapLocation(docSnap.id, docSnap.data()));
      
      const locationsWithEvents = await Promise.all(locations.map(async (loc) => {
         const eventsRef = collection(db, "events");
         const eventsQuery = query(
           eventsRef, 
           where("locationId", "==", loc.id),
           orderBy("timestamp", "desc")
         );
         const eventsSnap = await getDocs(eventsQuery);
         const events = eventsSnap.docs.map(e => mapEvent(e.id, e.data()));
         return { ...loc, events };
      }));
      
      return locationsWithEvents;
    },
  });
}

export function useLocation(id: number) {
  return useQuery({
    queryKey: ["locations", id],
    queryFn: async () => {
      const docRef = doc(db, "locations", String(id));
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      
      const location = mapLocation(docSnap.id, docSnap.data());
      
      const eventsRef = collection(db, "events");
      const eventsQuery = query(
        eventsRef, 
        where("locationId", "==", id),
        orderBy("timestamp", "desc")
      );
      const eventsSnap = await getDocs(eventsQuery);
      const events = eventsSnap.docs.map(e => mapEvent(e.id, e.data()));
      
      return { ...location, events };
    },
    enabled: !!id,
  });
}

export function useScanLocation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = getApiUrl(buildUrl(api.locations.scan.path, { id }));
      const res = await fetch(url, {
        method: "POST",
      });
      
      if (!res.ok) {
        throw new Error("Scan failed");
      }
      return api.locations.scan.responses[200].parse(await res.json());
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["locations", id] });
      toast({
        title: "Оновлення завершено",
        description: `${data.message}`,
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Помилка",
        description: "Не вдалося оновити дані локації",
        variant: "destructive",
      });
    },
  });
}

export function useScanAll() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl(api.locations.scanAll.path), {
        method: "POST",
      });
      
      if (!res.ok) {
        throw new Error("Scan all failed");
      }
      return api.locations.scanAll.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast({
        title: "Повне оновлення",
        description: `Оновлено подій: ${data.totalNewEvents}`,
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Помилка",
        description: "Не вдалося виконати повне сканування",
        variant: "destructive",
      });
    },
  });
}
