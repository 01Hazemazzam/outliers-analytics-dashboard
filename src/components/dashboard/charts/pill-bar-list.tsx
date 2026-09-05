import type { NamedValue } from "@/lib/data/queries/executive";
import { CHART_COLORS } from "@/lib/chart-colors";

interface PillBarListProps {
  data: NamedValue[];
  formatValue: (value: number) => string;
  multiColor?: boolean;
  dense?: boolean;
}

export function PillBarList({ data, formatValue, multiColor = true, dense = false }: PillBarListProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={dense ? "space-y-2" : "space-y-3"}>
      {data.map((d, i) => (
        <div key={d.name}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium">{d.name}</span>
            <span className="text-muted-foreground">{formatValue(d.value)}</span>
          </div>
          <div className={dense ? "h-1.5 w-full overflow-hidden rounded-full bg-muted" : "h-2.5 w-full overflow-hidden rounded-full bg-muted"}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: multiColor ? CHART_COLORS[i % CHART_COLORS.length] : "var(--chart-1)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
