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
    <CardContent className="border-t bg-muted/20">
      {showTitle && (
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4">
          Статистика по датам
        </h3>
      )}
      <div className="grid gap-4">
        {dailyStats.map((stat, idx) => (
          <div key={`stat-${idx}`} className="grid gap-2">
            <div className="font-semibold text-foreground">
              {format(stat.date, "EEEE, dd.MM.yyyy", { locale: uk })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-blue-700 font-medium mb-2">
                  {locationAddress}
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
                  {referenceAddress} (Еталон)
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
  );
}
