"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { NamedValue } from "@/lib/data/queries/executive";
import { CHART_COLORS } from "@/lib/chart-colors";
import { formatNumber } from "@/lib/format";

interface SegmentDonutChartProps {
  data: NamedValue[];
  /** Donut only, no side legend — for small tiles. Values still available on hover. */
  compact?: boolean;
}

export function SegmentDonutChart({ data, compact = false }: SegmentDonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const tooltip = (
    <Tooltip
      contentStyle={{
        background: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        fontSize: 12,
      }}
      formatter={(value, name) => [`${formatNumber(Number(value))} (${((Number(value) / total) * 100).toFixed(1)}%)`, name]}
    />
  );

  if (compact) {
    return (
      <ResponsiveContainer width="100%" height={110}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={28}
            outerRadius={48}
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          {tooltip}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          {tooltip}
        </PieChart>
      </ResponsiveContainer>
      <div className="min-w-0 flex-1 space-y-1.5">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex min-w-0 items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            <span className="flex-1 truncate">{entry.name}</span>
            <span className="shrink-0 text-muted-foreground">{((entry.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
