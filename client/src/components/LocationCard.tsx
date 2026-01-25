import { Link } from "wouter";
import { Clock, ArrowRight, Activity } from "lucide-react";
import { formatDistanceToNow, formatDistanceStrict } from "date-fns";
import { uk } from "date-fns/locale";
import { LocationWithEvents } from "@/hooks/use-locations";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";

interface LocationCardProps {
  location: LocationWithEvents;
}

export function LocationCard({ location }: LocationCardProps) {
  // Determine current status from the latest event if available
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
  
  return (
    <div className="group bg-card hover:bg-gradient-to-br hover:from-card hover:to-primary/5 border border-border/50 hover:border-primary/20 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center text-lg font-bold font-display text-primary">
            {location.number}
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Група {location.group || "-"}</span>
            <h3 className="font-bold text-foreground leading-tight line-clamp-1" title={location.address}>
              {location.address}
            </h3>
          </div>
        </div>
        {latestEvent ? (
          <StatusBadge isLightOn={isOnline} showIcon={false} />
        ) : (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md">Невідомо</span>
        )}
      </div>

      <div className="flex-1 space-y-4">
        {/* Status Text */}
        <div className="bg-secondary/30 rounded-xl p-3 border border-secondary">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">ПОТОЧНИЙ СТАН</span>
          </div>
          <p className="text-sm font-medium text-foreground">
            {location.currentStatusRaw || "Очікування даних..."}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-white/70 p-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Останні 2 періоди
          </p>
          <div className="space-y-2">
            {recentPeriods.length > 0 ? (
              recentPeriods.map((period, index) => (
                <div key={`${period.start.toISOString()}-${index}`} className="flex items-center justify-between text-xs">
                  <span className={period.isLightOn ? "text-emerald-600" : "text-rose-500"}>
                    {period.isLightOn ? "Світло" : "Немає"}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDistanceStrict(period.start, period.end, { locale: uk })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Недостатньо даних для підрахунку</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {location.lastScrapedAt 
              ? formatDistanceToNow(new Date(location.lastScrapedAt), { addSuffix: true, locale: uk }) 
              : "Ніколи"}
          </span>
        </div>
        
        <Link href={`/location/${location.id}`}>
          <Button variant="ghost" size="sm" className="group-hover:text-primary group-hover:bg-primary/10 transition-colors">
            Деталі <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
