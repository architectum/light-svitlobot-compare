import { Link } from "wouter";
import { Clock, ArrowRight, Activity } from "lucide-react";
import { formatDistanceToNow, formatDistanceStrict } from "date-fns";
import { uk } from "date-fns/locale";
import { LocationWithEvents } from "@/hooks/use-locations";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

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
    <div className={`group relative border border-border/40 rounded-2xl p-4 sm:p-5 shadow-md transition-all duration-300 flex flex-col h-full ${
      isOnline 
        ? "bg-gradient-to-br from-amber-50/80 to-yellow-50/60 hover:from-amber-100/80 hover:to-yellow-100/60 border-amber-200/50 hover:border-amber-300/50 hover:shadow-xl hover:shadow-amber-500/20" 
        : "bg-white/60 hover:bg-gray-50 border-border/40 hover:border-border/60 hover:shadow-lg"
    }`}>
      {/* Light Glow Effect for Online */}
      {isOnline && (
        <div className="absolute inset-0 rounded-2xl bg-amber-400/10 blur-xl -z-10 animate-pulse" />
      )}
      {/* Header */}
      <div className="flex justify-between items-start gap-3 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center text-base sm:text-lg font-bold font-display shrink-0 ${
              isOnline 
                ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-500/30"
                : "bg-gray-900 text-white shadow-lg"
            }`}>
            {location.number}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Група {location.group || "-"}
            </span>
            <h3 className="font-bold text-foreground leading-tight text-sm sm:text-base line-clamp-1" title={location.address}>
              {location.address}
            </h3>
          </div>
        </div>
        {latestEvent ? (
          <StatusBadge isLightOn={isOnline} showIcon={false} className="shrink-0" />
        ) : (
          <span className="text-[10px] sm:text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md shrink-0">Невідомо</span>
        )}
      </div>

      <div className="flex-1 space-y-3 sm:space-y-4">
        {/* Status Text */}
        <div className="bg-gradient-to-br from-secondary/40 to-secondary/20 rounded-xl p-3 border border-secondary/50">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isOnline ? "text-amber-500" : "text-primary"}`} />
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Поточний стан</span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-2">
            {location.currentStatusRaw || "Очікування даних..."}
          </p>
        </div>

        {/* Recent Periods */}
        <div className="rounded-xl border border-border/50 bg-white/80 p-3">
          <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Останні 2 періоди
          </p>
          <div className="space-y-2">
            {recentPeriods.length > 0 ? (
              recentPeriods.map((period, index) => {
                const duration = formatDistanceStrict(period.start, period.end, { locale: uk });
                const getPeriodText = () => {
                  // Text depends on current status (first item in list)
                  const isCurrentOn = recentPeriods[0]?.isLightOn;
                  if (isCurrentOn) {
                    // Current period: light was turned ON, previous: light was OFF
                    return index === 0 
                      ? `✅ Світло увімкнули ${duration} тому`
                      : `❌ Світла не було ${duration}`;
                  } else {
                    // Current period: light was turned OFF, previous: light was ON
                    return index === 0 
                      ? `❌ Світло вимкнули ${duration} тому`
                      : `✅ Світло було ${duration}`;
                  }
                };
                return (
                  <div key={`${period.start.toISOString()}-${index}`} className="text-xs sm:text-sm">
                    <span className={`font-medium ${period.isLightOn ? "text-emerald-600" : "text-rose-500"}`}>
                      {getPeriodText()}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">Недостатньо даних</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-border/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="line-clamp-1">
            {location.lastScrapedAt 
              ? formatDistanceToNow(new Date(location.lastScrapedAt), { addSuffix: true, locale: uk }) 
              : "Ніколи"}
          </span>
        </div>
        
        <Link
          href={`/location/${location.id}`}
          onClick={() =>
            trackEvent("location_card_click", {
              location_id: location.id,
              address: location.address,
              group: location.group ?? "",
            })
          }
        >
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm transition-colors ${
              isOnline 
                ? "group-hover:text-amber-600 group-hover:bg-amber-100/50" 
                : "group-hover:text-foreground group-hover:bg-gray-100"
            }`}
          >
            Деталі <ArrowRight className="ml-1.5 sm:ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
