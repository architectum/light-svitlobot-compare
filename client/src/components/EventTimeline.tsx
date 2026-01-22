import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { Event } from "@shared/schema";
import { StatusBadge } from "./StatusBadge";
import { motion } from "framer-motion";

interface EventTimelineProps {
  events: Event[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 bg-secondary/20 rounded-2xl border border-dashed border-border">
        <p className="text-muted-foreground">Історія подій порожня</p>
      </div>
    );
  }

  return (
    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-border before:via-border/50 before:to-transparent">
      {events.map((event, index) => (
        <motion.div 
          key={event.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="relative"
        >
          {/* Timeline Dot */}
          <div className={`absolute -left-8 mt-1.5 w-6 h-6 rounded-full border-4 border-background flex items-center justify-center ${event.isLightOn ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]'}`}>
          </div>

          <div className="bg-card border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <StatusBadge isLightOn={event.isLightOn} />
                <span className="text-sm text-muted-foreground font-mono">
                  {format(new Date(event.timestamp), "d MMMM HH:mm", { locale: uk })}
                </span>
              </div>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {event.message}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
