import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { CardContent } from "@/components/ui/card";

export type DailyStat = {
  date: Date;
  location: { hoursOff: number; hoursOn: number };
  reference: { hoursOff: number; hoursOn: number };
};

type ComparisonStatsProps = {
  dailyStats: DailyStat[];
  locationAddress: string;
  referenceAddress: string;
  showTitle?: boolean;
};

export function ComparisonStats({
  dailyStats,
  locationAddress,
  referenceAddress,
  showTitle = true,
}: ComparisonStatsProps) {
  return (
    <CardContent className="border-t bg-gradient-to-b from-muted/30 to-muted/10 p-4 sm:p-6">
      {showTitle && (
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary rounded-full" />
          Статистика по датам
        </h3>
      )}
      <div className="grid gap-4 sm:gap-5">
        {dailyStats.map((stat, idx) => (
          <div key={`stat-${idx}`} className="space-y-3 animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="font-semibold text-foreground text-sm sm:text-base capitalize">
              {format(stat.date, "EEEE, dd MMMM yyyy", { locale: uk })}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Current Location Stats */}
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 p-3 sm:p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-blue-700/80 font-semibold mb-3 line-clamp-1">
                  📍 {locationAddress}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 rounded-lg p-2.5 sm:p-3">
                    <div className="text-[10px] sm:text-xs text-rose-600/80 font-medium mb-1">🔴 Без світла</div>
                    <div className="text-lg sm:text-xl font-bold text-rose-700">{stat.location.hoursOff.toFixed(1)}<span className="text-sm font-normal ml-1">год</span></div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2.5 sm:p-3">
                    <div className="text-[10px] sm:text-xs text-emerald-600/80 font-medium mb-1">🟢 Зі світлом</div>
                    <div className="text-lg sm:text-xl font-bold text-emerald-700">{stat.location.hoursOn.toFixed(1)}<span className="text-sm font-normal ml-1">год</span></div>
                  </div>
                </div>
              </div>
              
              {/* Reference Location Stats */}
              <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-100/50 border border-orange-200/60 p-3 sm:p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-orange-700/80 font-semibold mb-3 line-clamp-1">
                  ⭐ {referenceAddress} <span className="text-orange-500">(Еталон)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 rounded-lg p-2.5 sm:p-3">
                    <div className="text-[10px] sm:text-xs text-rose-600/80 font-medium mb-1">🔴 Без світла</div>
                    <div className="text-lg sm:text-xl font-bold text-rose-700">{stat.reference.hoursOff.toFixed(1)}<span className="text-sm font-normal ml-1">год</span></div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2.5 sm:p-3">
                    <div className="text-[10px] sm:text-xs text-emerald-600/80 font-medium mb-1">🟢 Зі світлом</div>
                    <div className="text-lg sm:text-xl font-bold text-emerald-700">{stat.reference.hoursOn.toFixed(1)}<span className="text-sm font-normal ml-1">год</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  );
}
