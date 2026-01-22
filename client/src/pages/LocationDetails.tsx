import { useLocation as useWouterLocation, useRoute } from "wouter";
import { Layout } from "@/components/Layout";
import { useLocation, useScanLocation } from "@/hooks/use-locations";
import { EventTimeline } from "@/components/EventTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ArrowLeft, ExternalLink, Calendar, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { uk } from "date-fns/locale";

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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation */}
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/")} 
          className="pl-0 hover:pl-2 transition-all text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Назад до списку
        </Button>

        {/* Header Card */}
        <div className="bg-card rounded-3xl border shadow-sm p-6 md:p-8 relative overflow-hidden">
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
                  onClick={() => scan(id)} 
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
                >
                  <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
                    Джерело <ExternalLink className="w-3 h-3 ml-2" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Current Status Box */}
            <div className="bg-secondary/50 rounded-2xl p-6 border border-secondary backdrop-blur-sm">
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
            </div>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold px-2">Історія подій</h2>
          <EventTimeline events={location.events} />
        </div>
      </div>
    </Layout>
  );
}
