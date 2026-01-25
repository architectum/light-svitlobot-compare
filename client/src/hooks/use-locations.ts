import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";

// Types derived from the schema responses
export type LocationWithEvents = z.infer<typeof api.locations.get.responses[200]>;

export function useLocations() {
  return useQuery({
    queryKey: [api.locations.list.path],
    queryFn: async () => {
      const res = await fetch(getApiUrl(api.locations.list.path));
      if (!res.ok) throw new Error("Failed to fetch locations");
      return api.locations.list.responses[200].parse(await res.json());
    },
  });
}

export function useLocation(id: number) {
  return useQuery({
    queryKey: [api.locations.get.path, id],
    queryFn: async () => {
      const url = getApiUrl(buildUrl(api.locations.get.path, { id }));
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch location");
      return api.locations.get.responses[200].parse(await res.json());
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
      queryClient.invalidateQueries({ queryKey: [api.locations.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.locations.get.path, id] });
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
      queryClient.invalidateQueries({ queryKey: [api.locations.list.path] });
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
