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
  ResponsiveContainer 
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format, subDays, startOfMinute, addMinutes, isAfter, isBefore } from "date-fns";
import { uk } from "date-fns/locale";
import { Loader2 } from "lucide-react";

const REFERENCE_ADDRESS = "Берестейський 121-Б";

export default function ChartsPage() {
  const { data: locations, isLoading } = useLocations();

  const chartData = useMemo(() => {
    if (!locations) return null;

    const now = new Date();
    const threeDaysAgo = subDays(now, 3);
    
    // Generate minutes for the last 3 days
    const timePoints: Date[] = [];
    let current = startOfMinute(threeDaysAgo);
    while (isBefore(current, now)) {
      timePoints.push(current);
      current = addMinutes(current, 30); // 30-min intervals for performance, can be 1-min but might be slow
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

    return {
      timePoints,
      locations: locations.map(loc => ({
        ...loc,
        statusData: processEvents(loc.events, timePoints),
        isReference: loc.id === referenceLocation?.id
      })),
      refStatus
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

  const renderChart = (location: any, isMainRef = false) => {
    const data = chartData!.timePoints.map((time, idx) => ({
      time: format(time, "HH:mm (dd.MM)", { locale: uk }),
      status: location.statusData[idx],
      refStatus: chartData?.refStatus?.[idx] ?? 0
    }));

    return (
      <Card key={location.id} className="overflow-hidden">
        <CardHeader className="bg-muted/30 py-3">
          <CardTitle className="text-base font-medium flex items-center justify-between">
            <span>{location.address} {location.group ? `(Група ${location.group})` : ""}</span>
            {isMainRef && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Еталон</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
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
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.1}
                  strokeWidth={1}
                  isAnimationActive={false}
                  name="Берестейський 121-Б (Еталон)"
                />
              )}
              {/* Main status layer */}
              <Area
                type="stepAfter"
                dataKey="status"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.4}
                strokeWidth={2}
                name="Наявність світла"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {otherLocations.map(loc => renderChart(loc))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}