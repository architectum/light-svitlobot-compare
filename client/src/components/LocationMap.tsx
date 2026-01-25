import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type GeoPoint = {
  lat: number;
  lon: number;
};

type LocationMapProps = {
  address: string;
  className?: string;
};

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const DEFAULT_ZOOM = 16;

export function LocationMap({ address, className }: LocationMapProps) {
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchUrl = useMemo(() => {
    const params = new URLSearchParams({
      format: "jsonv2",
      limit: "1",
      q: address,
    });
    return `${NOMINATIM_ENDPOINT}?${params.toString()}`;
  }, [address]);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);
    setPoint(null);

    fetch(searchUrl)
      .then((response) => response.json())
      .then((data) => {
        if (!isActive) return;
        if (!Array.isArray(data) || data.length === 0) {
          setError("Координати не знайдено для цієї адреси.");
          return;
        }
        const first = data[0];
        const lat = Number.parseFloat(first.lat);
        const lon = Number.parseFloat(first.lon);
        if (Number.isNaN(lat) || Number.isNaN(lon)) {
          setError("Не вдалося визначити координати.");
          return;
        }
        setPoint({ lat, lon });
      })
      .catch(() => {
        if (!isActive) return;
        setError("Помилка завантаження карти.");
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [searchUrl]);

  const mapEmbed = useMemo(() => {
    if (!point) return null;
    const delta = 0.01;
    const bbox = `${point.lon - delta}%2C${point.lat - delta}%2C${point.lon + delta}%2C${point.lat + delta}`;
    const marker = `${point.lat}%2C${point.lon}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
  }, [point]);

  const mapLink = useMemo(() => {
    if (!point) return null;
    return `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=${DEFAULT_ZOOM}/${point.lat}/${point.lon}`;
  }, [point]);

  return (
    <div className={cn("rounded-3xl border bg-card p-6 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-display font-bold">Розташування на карті</h2>
        <a
          href={mapLink ?? `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          Відкрити в OpenStreetMap
        </a>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{address}</p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border/60">
        {isLoading ? (
          <div className="h-64 animate-pulse bg-muted/20" />
        ) : error ? (
          <div className="flex h-64 items-center justify-center bg-muted/10 px-6 text-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          <iframe
            title="OpenStreetMap"
            src={mapEmbed ?? undefined}
            className="h-64 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Дані карти © OpenStreetMap contributors.
      </p>
    </div>
  );
}
