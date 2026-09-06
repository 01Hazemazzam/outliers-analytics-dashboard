"use client";

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatMonth } from "@/lib/format";

export interface DualTrendPoint {
  month: string;
  primary: number;
  secondary: number;
}

interface DualTrendChartProps {
  data: DualTrendPoint[];
  primaryLabel: string;
  secondaryLabel: string;
  primaryFormatter: (value: number) => string;
  secondaryFormatter: (value: number) => string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function DualTrendChart({
  data,
  primaryLabel,
  secondaryLabel,
  primaryFormatter,
  secondaryFormatter,
  primaryColor = "var(--chart-1)",
  secondaryColor = "var(--chart-2)",
}: DualTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          yAxisId="primary"
          tickFormatter={(v: number) => primaryFormatter(v)}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <YAxis
          yAxisId="secondary"
          orientation="right"
          tickFormatter={(v: number) => secondaryFormatter(v)}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(label) => formatMonth(String(label))}
          formatter={(value, name) =>
            name === "primary" ? [primaryFormatter(Number(value)), primaryLabel] : [secondaryFormatter(Number(value)), secondaryLabel]
          }
        />
        <Bar
          yAxisId="secondary"
          dataKey="secondary"
          name="secondary"
          fill={secondaryColor}
          radius={[3, 3, 0, 0]}
          maxBarSize={18}
          opacity={0.55}
          isAnimationActive={false}
        />
        <Line
          yAxisId="primary"
          type="monotone"
          dataKey="primary"
          name="primary"
          stroke={primaryColor}
          strokeWidth={2.25}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
