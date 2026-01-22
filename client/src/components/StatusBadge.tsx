import { cn } from "@/lib/utils";
import { Zap, ZapOff } from "lucide-react";

interface StatusBadgeProps {
  isLightOn: boolean;
  className?: string;
  showIcon?: boolean;
  label?: string;
}

export function StatusBadge({ isLightOn, className, showIcon = true, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border transition-all duration-200",
        isLightOn
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-500/10"
          : "bg-rose-50 text-rose-700 border-rose-200 shadow-sm shadow-rose-500/10",
        className
      )}
    >
      {showIcon && (
        isLightOn 
          ? <Zap className="w-3.5 h-3.5 fill-current" /> 
          : <ZapOff className="w-3.5 h-3.5" />
      )}
      {label || (isLightOn ? "Світло Є" : "Світла Немає")}
    </span>
  );
}
