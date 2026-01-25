import { useState } from "react";
import { Layout } from "@/components/Layout";
import { LocationCard } from "@/components/LocationCard";
import { useLocations, useScanAll } from "@/hooks/use-locations";
import { Button } from "@/components/ui/button";
import { RefreshCw, Search, Loader2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { api } from "@shared/routes";
import { trackEvent } from "@/lib/analytics";
import { getApiUrl } from "@/lib/api";

export default function Dashboard() {
  const { data: locations, isLoading } = useLocations();
  const { mutate: scanAll, isPending: isScanning } = useScanAll();
  const [search, setSearch] = useState("");

  const filteredLocations = locations?.filter(loc => 
    loc.address.toLowerCase().includes(search.toLowerCase()) || 
    loc.number?.toString().includes(search)
  );

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Дані зі світлоботів навколо Берестейський просп. 121</h1>
            <p className="text-muted-foreground mt-2">
              Слідкуйте за станом електроенергії навколо і порівнюйте реальні відключення на вкладці "Порівняти відключення" у реальному часі.
            </p>
          </div>
          
          <div className="flex gap-3">
            {/* <Button 
              variant="outline"
              size="lg"
              onClick={() => window.open(getApiUrl(api.locations.downloadAll.path), '_blank')}
              className="border-border/60 hover:bg-secondary transition-all"
            >
              <Download className="mr-2 h-5 w-5" />
              Скачати JSON
            </Button> */}
            <Button 
              size="lg"
              onClick={() => {
                trackEvent("scan_all_click", { source: "dashboard" });
                scanAll();
              }} 
              disabled={isScanning}
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Оновлення...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Оновити Всі
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Пошук за адресою або номером..." 
            className="pl-10 h-12 rounded-xl bg-white shadow-sm border-border/50 focus:border-primary focus:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (!value) return;
              trackEvent("location_search", { query: value, result_count: filteredLocations?.length ?? 0 });
            }}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-muted/20 animate-pulse border border-border/50" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLocations?.map((location, idx) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <LocationCard location={location} />
              </motion.div>
            ))}
            
            {filteredLocations?.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-border/60">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Нічого не знайдено</h3>
                <p className="text-muted-foreground">Спробуйте змінити параметри пошуку</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
