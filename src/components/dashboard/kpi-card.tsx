import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";

export type KpiTone = "neutral" | "positive" | "warning" | "negative";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: KpiTone;
  hint?: string;
}

export function KpiCard({ label, value, icon: Icon, tone = "neutral", hint }: KpiCardProps) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <Icon
            className={cn(
              "h-4 w-4",
              tone === "positive" && "text-positive",
              tone === "warning" && "text-warning",
              tone === "negative" && "text-negative",
              tone === "neutral" && "text-muted-foreground",
            )}
          />
        </div>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-[11px] text-muted-foreground truncate">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function KpiCardSkeleton() {
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          <div className="h-4 w-4 rounded bg-muted animate-pulse" />
        </div>
        <div className="mt-2 h-7 w-24 rounded bg-muted animate-pulse" />
        <div className="mt-2 h-3 w-16 rounded bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
}
