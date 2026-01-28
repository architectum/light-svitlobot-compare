import { useMemo } from "react";
import { useLocation as useWouterLocation, useRoute } from "wouter";
import { Layout } from "@/components/Layout";
import { useLocation, useLocations, useScanLocation } from "@/hooks/use-locations";
import { EventTimeline } from "@/components/EventTimeline";
import { LocationMap } from "@/components/LocationMap";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw, ArrowLeft, ExternalLink, Calendar, Info, Activity, Download, BarChart3 } from "lucide-react";
import { formatDistanceToNow, formatDistanceStrict, format, subDays, startOfMinute, addMinutes, isBefore, startOfDay, addDays, isAfter } from "date-fns";
import { uk } from "date-fns/locale";
import { api, buildUrl } from "@shared/routes";
import { trackEvent } from "@/lib/analytics";
import { getApiUrl } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const REFERENCE_ADDRESS = "Берестейський 121-Б";

export default function LocationDetails() {
  const [match, params] = useRoute("/location/:id");
  const [, setLocation] = useWouterLocation();
  const id = parseInt(params?.id || "0");
  
  const { data: location, isLoading } = useLocation(id);
  const { data: allLocations, isLoading: isLoadingAll } = useLocations();
  const { mutate: scan, isPending: isScanning } = useScanLocation();

  // Find reference location
  const referenceLocation = useMemo(() => {
    if (!allLocations) return null;
    return allLocations.find(l => l.address.includes(REFERENCE_ADDRESS));
  }, [allLocations]);

  // Check if current location is the reference
  const isCurrentReference = location?.address?.includes(REFERENCE_ADDRESS) ?? false;

  // Build comparison chart data
  const comparisonData = useMemo(() => {
    if (!location || !referenceLocation || isCurrentReference) return null;

    const now = new Date();
    const threeDaysAgo = subDays(now, 3);
    const intervalMinutes = 30;

    // Generate time points for the last 3 days
    const timePoints: Date[] = [];
    let current = startOfMinute(threeDaysAgo);
    while (isBefore(current, now)) {
      timePoints.push(current);
      current = addMinutes(current, intervalMinutes);
    }

    const processEvents = (events: any[], points: Date[]) => {
      const sortedEvents = [...events].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return points.map(point => {
        let status = 0;
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

    const locationStatus = processEvents(location.events || [], timePoints);
    const refStatus = processEvents(referenceLocation.events || [], timePoints);

    // Build chart data
    const chartData = timePoints.map((time, idx) => ({
      time: format(time, "HH:mm (dd.MM)", { locale: uk }),
      status: locationStatus[idx],
      refStatus: refStatus[idx],
    }));

    // Build daily statistics
    const buildDailyStats = () => {
      return [0, 1, 2].map(offset => {
        const dayStart = startOfDay(subDays(now, offset));
        const nextDay = addDays(dayStart, 1);
        let locOffCount = 0;
        let locOnCount = 0;
        let refOffCount = 0;
        let refOnCount = 0;

        timePoints.forEach((point, idx) => {
          if ((isAfter(point, dayStart) || point.getTime() === dayStart.getTime()) && isBefore(point, nextDay)) {
            if (locationStatus[idx] === 1) {
              locOnCount += 1;
            } else {
              locOffCount += 1;
            }
            if (refStatus[idx] === 1) {
              refOnCount += 1;
            } else {
              refOffCount += 1;
            }
          }
        });

        const locHoursOff = (locOffCount * intervalMinutes) / 60;
        const locHoursOn = (locOnCount * intervalMinutes) / 60;
        const refHoursOff = (refOffCount * intervalMinutes) / 60;
        const refHoursOn = (refOnCount * intervalMinutes) / 60;

        return {
          date: dayStart,
          location: { hoursOff: locHoursOff, hoursOn: locHoursOn },
          reference: { hoursOff: refHoursOff, hoursOn: refHoursOn },
        };
      });
    };

    return {
      chartData,
      dailyStats: buildDailyStats(),
    };
  }, [location, referenceLocation, isCurrentReference]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!location) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Локацію не знайдено</h2>
          <Button onClick={() => setLocation("/")} className="mt-4">
            Повернутися
          </Button>
        </div>
      </Layout>
    );
  }

  const latestEvent = location.events && location.events.length > 0 ? location.events[0] : null;
  const isOnline = latestEvent?.isLightOn ?? false;
  const recentEvents = location.events ? [...location.events] : [];

  const getRecentPeriods = () => {
    if (recentEvents.length === 0) return [];
    const sorted = recentEvents.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const now = new Date();
    const currentStatus = sorted[0].isLightOn;
    const currentStart = new Date(sorted[0].timestamp);
    const periods = [
      {
        isLightOn: currentStatus,
        start: currentStart,
        end: now,
      },
    ];

    let index = 1;
    while (index < sorted.length && sorted[index].isLightOn === currentStatus) {
      index += 1;
    }

    if (index < sorted.length) {
      const previousStatus = sorted[index].isLightOn;
      const previousStart = new Date(sorted[index].timestamp);
      periods.push({
        isLightOn: previousStatus,
        start: previousStart,
        end: currentStart,
      });
    }

    return periods;
  };

  const recentPeriods = getRecentPeriods();

  // const downloadUrl = getApiUrl(buildUrl(api.locations.downloadOne.path, { id }));

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => {
              trackEvent("navigate_back", { from: "location_details", to: "/" });
              setLocation("/");
            }} 
            className="pl-0 hover:pl-2 transition-all text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Назад до списку
          </Button>

          {/* <Button 
            variant="outline"
            size="sm"
            onClick={() => window.open(downloadUrl, '_blank')}
            className="border-border/60 hover:bg-secondary"
          >
            <Download className="mr-2 h-4 w-4" />
            JSON
          </Button> */}
        </div>

        {/* Header Card */}
        <div className="bg-card rounded-3xl border shadow-lg p-6 md:p-8 relative overflow-hidden">
          {/* Decorative background glow */}
          <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-20 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Група {location.group}
                  </span>
                  <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    № {location.number}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  {location.address}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Оновлено: {location.lastScrapedAt 
                      ? formatDistanceToNow(new Date(location.lastScrapedAt), { addSuffix: true, locale: uk }) 
                      : "Ніколи"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 min-w-[160px]">
                <StatusBadge 
                  isLightOn={isOnline} 
                  className="py-2 px-4 text-base justify-center" 
                />
                <Button 
                  onClick={() => {
                    trackEvent("scan_location_click", { location_id: id, address: location.address });
                    scan(id);
                  }} 
                  disabled={isScanning}
                  variant="outline"
                  className="w-full border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40"
                >
                  {isScanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Сканувати
                </Button>
                <a 
                  href={location.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full"
                  onClick={() =>
                    trackEvent("source_link_click", {
                      location_id: id,
                      address: location.address,
                      url: location.url,
                    })
                  }
                >
                  <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
                    Джерело <ExternalLink className="w-3 h-3 ml-2" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Current Status Box */}
            <div className="bg-secondary/50 rounded-2xl p-6 border border-secondary backdrop-blur-sm">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Bot Status */}
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-background rounded-lg shadow-sm">
                    <Info className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-1">
                      Поточний статус від бота
                    </h3>
                    <p className="text-lg md:text-xl font-medium text-foreground">
                      {location.currentStatusRaw || "Дані відсутні"}
                    </p>
                  </div>
                </div>

                {/* Last 2 Periods */}
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-background rounded-lg shadow-sm">
                    <Activity className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">
                      Останні 2 періоди
                    </h3>
                    <div className="space-y-2">
                      {recentPeriods.length > 0 ? (
                        recentPeriods.map((period, index) => (
                          <div key={`${period.start.toISOString()}-${index}`} className="flex items-center justify-between text-sm">
                            <span className={`font-medium ${period.isLightOn ? "text-emerald-600" : "text-rose-500"}`}>
                              {period.isLightOn ? "🟢 Світло є" : "🔴 Світла немає"}
                            </span>
                            <span className="text-muted-foreground font-medium">
                              {formatDistanceStrict(period.start, period.end, { locale: uk })}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Недостатньо даних для підрахунку</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <LocationMap address={location.address} />

        {/* Comparison Chart Section */}
        {comparisonData && !isCurrentReference && (
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold px-2 flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary" />
              Порівняння з еталонною адресою
            </h2>
            <Card className="overflow-hidden border-border/60 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white py-4">
                <CardTitle className="text-base font-semibold flex flex-wrap items-center justify-between gap-2">
                  <span>Порівняння за останні 3 доби</span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    Еталон: {REFERENCE_ADDRESS}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-64 md:h-80 rounded-2xl border border-border/50 bg-white">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={comparisonData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,23,42,0.08)" />
                      <XAxis
                        dataKey="time"
                        fontSize={10}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        interval={Math.floor(comparisonData.chartData.length / 6)}
                      />
                      <YAxis
                        domain={[0, 1]}
                        ticks={[0, 1]}
                        fontSize={10}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => value === 1 ? 'Є' : 'Немає'}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                        formatter={(value: number, name: string) => [
                          value === 1 ? 'Є світло' : 'Немає світла',
                          name === 'status' ? location.address : REFERENCE_ADDRESS
                        ]}
                      />
                      {/* Reference layer */}
                      <Area
                        type="stepAfter"
                        dataKey="refStatus"
                        stroke="#f97316"
                        fill="#f97316"
                        fillOpacity={0.15}
                        strokeWidth={1}
                        isAnimationActive={false}
                        name={`${REFERENCE_ADDRESS} (Еталон)`}
                      />
                      {/* Current location layer */}
                      <Area
                        type="stepAfter"
                        dataKey="status"
                        stroke="#2563eb"
                        fill="#2563eb"
                        fillOpacity={0.35}
                        strokeWidth={2}
                        name="Поточна адреса"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-blue-500/35 border border-blue-500 rounded" />
                    <span className="text-muted-foreground">{location.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-orange-500/15 border border-orange-500 rounded" />
                    <span className="text-muted-foreground">{REFERENCE_ADDRESS} (Еталон)</span>
                  </div>
                </div>
              </CardContent>

              {/* Daily Statistics */}
              <CardContent className="border-t bg-muted/20">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4">
                  Статистика по датам
                </h3>
                <div className="grid gap-4">
                  {comparisonData.dailyStats.map((stat, idx) => (
                    <div key={`stat-${idx}`} className="grid gap-2">
                      <div className="font-semibold text-foreground">
                        {format(stat.date, "EEEE, dd.MM.yyyy", { locale: uk })}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                          <div className="text-xs uppercase tracking-wide text-blue-700 font-medium mb-2">
                            {location.address}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-rose-600 font-medium">🔴 Без світла:</span>
                              <span className="ml-1 font-bold">{stat.location.hoursOff.toFixed(1)} год</span>
                            </div>
                            <div>
                              <span className="text-emerald-600 font-medium">🟢 Зі світлом:</span>
                              <span className="ml-1 font-bold">{stat.location.hoursOn.toFixed(1)} год</span>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3">
                          <div className="text-xs uppercase tracking-wide text-orange-700 font-medium mb-2">
                            {REFERENCE_ADDRESS} (Еталон)
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-rose-600 font-medium">🔴 Без світла:</span>
                              <span className="ml-1 font-bold">{stat.reference.hoursOff.toFixed(1)} год</span>
                            </div>
                            <div>
                              <span className="text-emerald-600 font-medium">🟢 Зі світлом:</span>
                              <span className="ml-1 font-bold">{stat.reference.hoursOn.toFixed(1)} год</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Message for reference location */}
        {isCurrentReference && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-800">Це еталонна адреса</h3>
                <p className="text-sm text-orange-700">
                  Ця локація використовується як еталон для порівняння з іншими адресами.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold px-2">Історія подій</h2>
          <EventTimeline events={location.events} />
        </div>
      </div>
    </Layout>
  );
}
