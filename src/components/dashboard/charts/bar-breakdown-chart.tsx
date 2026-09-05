"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { NamedValue } from "@/lib/data/queries/executive";
import { CHART_COLORS } from "@/lib/chart-colors";

interface BarBreakdownChartProps {
  data: NamedValue[];
  formatValue: (value: number) => string;
  height?: number;
  /** When true, each bar gets a distinct color from the palette (categorical breakdowns); otherwise every bar shares a single accent color (rank-ordered breakdowns). */
  multiColor?: boolean;
}

export function BarBreakdownChart({ data, formatValue, height = 260, multiColor = true }: BarBreakdownChartProps) {
  const longestLabel = Math.max(...data.map((d) => d.name.length), 4);
  const yAxisWidth = Math.min(140, Math.max(64, longestLabel * 6.5));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          tickFormatter={formatValue}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={yAxisWidth}
          tick={{ fontSize: 12, fill: "var(--foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [formatValue(Number(value)), "Value"]}
        />
        <Bar dataKey="value" name="Value" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={multiColor ? CHART_COLORS[index % CHART_COLORS.length] : "var(--chart-1)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
