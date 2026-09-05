import { TrendingUp, TrendingDown, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Insight } from "@/lib/data/queries/executive";
import { cn } from "cn";

const ICONS: Record<Insight["sentiment"], typeof TrendingUp> = {
  positive: TrendingUp,
  negative: TrendingDown,
  warning: AlertTriangle,
  neutral: Info,
};

const TONE_CLASSES: Record<Insight["sentiment"], string> = {
  positive: "text-positive bg-positive/10",
  negative: "text-negative bg-negative/10",
  warning: "text-warning bg-warning/10",
  neutral: "text-muted-foreground bg-muted",
};

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Insights</CardTitle>
        <CardDescription>Automatically generated from the currently loaded data — only shown when supported by it.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2.5 sm:grid-cols-2">
        {insights.map((insight) => {
          const Icon = ICONS[insight.sentiment];
          return (
            <div key={insight.id} className="flex items-start gap-2.5 rounded-lg border border-border p-3">
              <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", TONE_CLASSES[insight.sentiment])}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <p className="text-sm leading-snug">{insight.text}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
