import { useMemo } from "react";
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
import { format, subDays, startOfMinute, addMinutes, isAfter, isBefore, startOfDay, addDays } from "date-fns";
import { uk } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const REFERENCE_ADDRESS = "Берестейський 121-Б";

export default function ChartsPage() {
  const { data: locations, isLoading } = useLocations();

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

    const formatHours = (value: number) => value.toFixed(1);

    return (
      <Card
        key={location.id}
        className="overflow-hidden border-border/60 shadow-sm"
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
            {isMainRef && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Еталон</span>}
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

            <div className="h-56 md:h-64 aspect-square rounded-2xl border border-border/60 bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
              <div className="absolute inset-0 opacity-70" style={{
                backgroundImage: "linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }} />
              <div className="absolute inset-0" aria-hidden>
                {markerPositions.map((marker) => {
                  const isReference = marker.id === referenceId;
                  const isCurrent = marker.id === location.id;
                  const sizeClass = isReference || isCurrent ? "h-3.5 w-3.5" : "h-2.5 w-2.5";
                  const colorClass = isReference
                    ? "bg-red-500"
                    : isCurrent
                      ? "bg-emerald-500"
                      : "bg-slate-400";
                  return (
                    <span
                      key={marker.id}
                      className={`absolute ${sizeClass} ${colorClass} rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.8)]`}
                      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    />
                  );
                })}
              </div>
              <div className="absolute bottom-3 left-3 text-[11px] font-semibold text-muted-foreground bg-white/80 px-2 py-1 rounded-full border border-border/60">
                Мапа локацій
              </div>
            </div>
          </div>
        </CardContent>
        <CardContent className="border-t bg-muted/20">
          <div className="grid gap-3 text-sm">
            {locationStats.map((stat, idx) => (
              <div key={`${location.id}-stat-${idx}`} className="grid gap-1">
                <div className="font-semibold text-foreground">
                  {format(stat.date, "dd.MM.yyyy", { locale: uk })}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                  <div className="rounded-md bg-background/80 px-3 py-2">
                    <div className="text-xs uppercase tracking-wide">Поточна адреса</div>
                    <div className="mt-1">Без світла: {formatHours(stat.hoursOff)} год</div>
                    <div>Зі світлом: {formatHours(stat.hoursOn)} год</div>
                  </div>
                  <div className="rounded-md bg-background/80 px-3 py-2">
                    <div className="text-xs uppercase tracking-wide">Еталонна адреса</div>
                    <div className="mt-1">Без світла: {formatHours(referenceStats[idx]?.hoursOff ?? 0)} год</div>
                    <div>Зі світлом: {formatHours(referenceStats[idx]?.hoursOn ?? 0)} год</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
      <Layout>
      <div className="space-y-8 max-w-none">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Порівняльні Графіки</h1>
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
