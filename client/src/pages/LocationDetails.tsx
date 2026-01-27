import { useLocation as useWouterLocation, useRoute } from "wouter";
import { Layout } from "@/components/Layout";
import { useLocation, useScanLocation } from "@/hooks/use-locations";
import { EventTimeline } from "@/components/EventTimeline";
import { LocationMap } from "@/components/LocationMap";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ArrowLeft, ExternalLink, Calendar, Info, Activity, Download } from "lucide-react";
import { formatDistanceToNow, formatDistanceStrict } from "date-fns";
import { uk } from "date-fns/locale";
import { api, buildUrl } from "@shared/routes";
import { trackEvent } from "@/lib/analytics";
import { getApiUrl } from "@/lib/api";

export default function LocationDetails() {
  const [match, params] = useRoute("/location/:id");
  const [, setLocation] = useWouterLocation();
  const id = parseInt(params?.id || "0");
  
  const { data: location, isLoading } = useLocation(id);
  const { mutate: scan, isPending: isScanning } = useScanLocation();

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

        {/* Timeline Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold px-2">Історія подій</h2>
          <EventTimeline events={location.events} />
        </div>
      </div>
    </Layout>
  );
}
