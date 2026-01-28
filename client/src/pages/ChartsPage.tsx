import { useMemo, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useLocations } from "@/hooks/use-locations";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComparisonStats, type DailyStat } from "@/components/ComparisonStats";
import { format, subDays, startOfMinute, addMinutes, isAfter, isBefore, startOfDay, addDays } from "date-fns";
import { uk } from "date-fns/locale";
import { Loader2, ExternalLink } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

type GeoPoint = {
  lat: number;
  lon: number;
  id: number;
  address: string;
  isReference: boolean;
  isCurrent: boolean;
};

const REFERENCE_ADDRESS = "Берестейський 121-Б";

// Cache for geocoded coordinates
const geocodeCache: Map<string, { lat: number; lon: number } | null> = new Map();

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address) ?? null;
  }
  
  try {
    const fullAddress = `${address}, Київ, Україна`;
    const params = new URLSearchParams({
      format: "jsonv2",
      limit: "1",
      q: fullAddress,
    });
    const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`);
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      geocodeCache.set(address, null);
      return null;
    }
    
    const result = {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
    geocodeCache.set(address, result);
    return result;
  } catch {
    geocodeCache.set(address, null);
    return null;
  }
}

export default function ChartsPage() {
  const { data: locations, isLoading } = useLocations();
  const [, setNavigate] = useLocation();
  const [geoPoints, setGeoPoints] = useState<Map<number, { lat: number; lon: number }>>(new Map());

  // Geocode all locations
  useEffect(() => {
    if (!locations) return;
    
    const geocodeAll = async () => {
      const newPoints = new Map<number, { lat: number; lon: number }>();
      
      // Geocode with delay to respect rate limits
      for (const loc of locations) {
        const coords = await geocodeAddress(loc.address);
        if (coords) {
          newPoints.set(loc.id, coords);
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setGeoPoints(newPoints);
    };
    
    geocodeAll();
  }, [locations]);

  const chartData = useMemo(() => {
    if (!locations) return null;

    const now = new Date();
    const threeDaysAgo = subDays(now, 3);
    const intervalMinutes = 30;
    
    // Generate minutes for the last 3 days
    const timePoints: Date[] = [];
    let current = startOfMinute(threeDaysAgo);
    while (isBefore(current, now)) {
      timePoints.push(current);
      current = addMinutes(current, intervalMinutes); // 30-min intervals for performance, can be 1-min but might be slow
    }

    const referenceLocation = locations.find(l => l.address.includes(REFERENCE_ADDRESS));
    
    const processEvents = (events: any[], points: Date[]) => {
      const sortedEvents = [...events].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return points.map(point => {
        let status = 0;
        // Find the latest event before this point
        for (let i = sortedEvents.length - 1; i >= 0; i--) {
          const eventTime = new Date(sortedEvents[i].timestamp);
          if (isBefore(eventTime, point) || eventTime.getTime() === point.getTime()) {
            status = sortedEvents[i].isLightOn ? 1 : 0;
            break;
          }
        }
        return status;
      });
    };

    const refStatus = referenceLocation ? processEvents(referenceLocation.events, timePoints) : null;

    const buildDailyStats = (statusData: number[]) => {
      const dayLabels = [0, 1, 2].map(offset => {
        const dayStart = startOfDay(subDays(now, offset));
        const nextDay = addDays(dayStart, 1);
        let offCount = 0;
        let onCount = 0;

        timePoints.forEach((point, idx) => {
          if (isAfter(point, dayStart) || point.getTime() === dayStart.getTime()) {
            if (isBefore(point, nextDay)) {
              if (statusData[idx] === 1) {
                onCount += 1;
              } else {
                offCount += 1;
              }
            }
          }
        });

        const hoursOff = (offCount * intervalMinutes) / 60;
        const hoursOn = (onCount * intervalMinutes) / 60;

        return {
          date: dayStart,
          hoursOff,
          hoursOn
        };
      });

      return dayLabels;
    };

    const referenceStats = referenceLocation ? buildDailyStats(processEvents(referenceLocation.events, timePoints)) : null;

    return {
      timePoints,
      locations: locations.map(loc => ({
        ...loc,
        statusData: processEvents(loc.events, timePoints),
        isReference: loc.id === referenceLocation?.id
      })),
      refStatus,
      referenceStats,
      intervalMinutes
    };
  }, [locations]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  const referenceLocationData = chartData?.locations.find(l => l.isReference);
  const otherLocations = chartData?.locations.filter(l => !l.isReference) || [];

  const buildStatsForLocation = (statusData: number[]) => {
    if (!chartData) return [];

    const now = new Date();
    const intervalMinutes = chartData.intervalMinutes;

    return [0, 1, 2].map(offset => {
      const dayStart = startOfDay(subDays(now, offset));
      const nextDay = addDays(dayStart, 1);
      let offCount = 0;
      let onCount = 0;

      chartData.timePoints.forEach((point, idx) => {
        if (isAfter(point, dayStart) || point.getTime() === dayStart.getTime()) {
          if (isBefore(point, nextDay)) {
            if (statusData[idx] === 1) {
              onCount += 1;
            } else {
              offCount += 1;
            }
          }
        }
      });

      const hoursOff = (offCount * intervalMinutes) / 60;
      const hoursOn = (onCount * intervalMinutes) / 60;

      return {
        date: dayStart,
        hoursOff,
        hoursOn
      };
    });
  };

  const renderChart = (location: any, isMainRef = false) => {
    const data = chartData!.timePoints.map((time, idx) => ({
      time: format(time, "HH:mm (dd.MM)", { locale: uk }),
      status: location.statusData[idx],
      refStatus: chartData?.refStatus?.[idx] ?? 0
    }));

    const allLocations = chartData?.locations ?? [];
    const markerPositions = allLocations.map((loc, idx) => {
      const seed = (loc.id ?? idx) * 37;
      const x = 12 + (seed % 70);
      const y = 12 + ((seed * 3) % 70);
      return { id: loc.id, x, y };
    });
    const referenceId = chartData?.locations.find((loc) => loc.isReference)?.id;
    const locationStats = chartData?.timePoints && location.statusData
      ? buildStatsForLocation(location.statusData)
      : [];

    const referenceStats = chartData?.referenceStats ?? [];

    // Transform stats to ComparisonStats format
    const comparisonDailyStats: DailyStat[] = locationStats.map((stat, idx) => ({
      date: stat.date,
      location: { hoursOff: stat.hoursOff, hoursOn: stat.hoursOn },
      reference: { 
        hoursOff: referenceStats[idx]?.hoursOff ?? 0, 
        hoursOn: referenceStats[idx]?.hoursOn ?? 0 
      },
    }));

    return (
      <Card
        key={location.id}
        className="overflow-hidden border-border/60 shadow-lg hover:shadow-xl transition-shadow"
        onClick={() =>
          trackEvent("chart_card_click", {
            location_id: location.id,
            address: location.address,
            is_reference: isMainRef,
          })
        }
      >
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white py-4">
          <CardTitle className="text-base font-semibold flex flex-wrap items-center justify-between gap-2">
            <span>{location.address} {location.group ? `(Група ${location.group})` : ""}</span>
            <div className="flex items-center gap-2">
              {isMainRef && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Еталон</span>}
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  trackEvent("chart_details_click", {
                    location_id: location.id,
                    address: location.address,
                  });
                  setNavigate(`/location/${location.id}`);
                }}
                className="text-xs h-7 px-2 border-primary/30 text-primary hover:bg-primary/5"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Деталі
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] items-stretch">
            <div className="h-56 md:h-64 rounded-2xl border border-border/50 bg-white">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,23,42,0.08)" />
                  <XAxis 
                    dataKey="time" 
                    fontSize={10} 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    interval={Math.floor(data.length / 6)}
                  />
                  <YAxis 
                    domain={[0, 1]} 
                    ticks={[0, 1]} 
                    fontSize={10}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  {/* Reference layer (Beresterskyi 121-B) */}
                  {!isMainRef && (
                    <Area
                      type="stepAfter"
                      dataKey="refStatus"
                      stroke="#f97316"
                      fill="#f97316"
                      fillOpacity={0.15}
                      strokeWidth={1}
                      isAnimationActive={false}
                      name="Берестейський 121-Б (Еталон)"
                    />
                  )}
                  {/* Main status layer */}
                  <Area
                    type="stepAfter"
                    dataKey="status"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.35}
                    strokeWidth={2}
                    name="Наявність світла"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {(() => {
              const currentCoords = geoPoints.get(location.id);
              const refCoords = referenceId ? geoPoints.get(referenceId) : null;
              
              if (currentCoords) {
                // Calculate bounding box to show both current and reference locations
                const points = [currentCoords];
                if (refCoords && !isMainRef) points.push(refCoords);
                
                const lats = points.map(p => p.lat);
                const lons = points.map(p => p.lon);
                const minLat = Math.min(...lats) - 0.005;
                const maxLat = Math.max(...lats) + 0.005;
                const minLon = Math.min(...lons) - 0.01;
                const maxLon = Math.max(...lons) + 0.01;
                
                const bbox = `${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}`;
                const marker = `${currentCoords.lat}%2C${currentCoords.lon}`;
                const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
                
                return (
                  <div className="h-56 md:h-64 aspect-square rounded-2xl border border-border/60 overflow-hidden shadow-md">
                    <iframe
                      title="OpenStreetMap"
                      src={mapUrl}
                      className="h-full w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                );
              }
              
              // Fallback placeholder while loading
              return (
                <div className="h-56 md:h-64 aspect-square rounded-2xl border border-border/60 bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden shadow-md">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Завантаження карти...</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
        <ComparisonStats
          dailyStats={comparisonDailyStats}
          locationAddress={location.address}
          referenceAddress={REFERENCE_ADDRESS}
        />
      </Card>
    );
  };

  return (
      <Layout>
      <div className="space-y-8 max-w-none">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Порівняти відключення</h1>
          <p className="text-muted-foreground mt-2">
            Аналіз наявності світла за останні 3 доби у порівнянні з просп. Берестейський 121.
          </p>
        </div>

        <div className="space-y-6">
          {/* Reference Location First */}
          {referenceLocationData && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 px-2">
                <div className="w-2 h-6 bg-primary rounded-full" />
                Еталонна адреса
              </h2>
              {renderChart(referenceLocationData, true)}
            </div>
          )}

          {/* Other Locations */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 px-2">
              <div className="w-2 h-6 bg-muted-foreground/30 rounded-full" />
              Інші локації
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {otherLocations.map(loc => renderChart(loc))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
