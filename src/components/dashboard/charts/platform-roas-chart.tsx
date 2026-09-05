"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PlatformPerformance } from "@/lib/data/queries/executive";
import { formatCurrency } from "@/lib/format";

interface PlatformRoasChartProps {
  data: PlatformPerformance[];
  blendedRoas: number;
}

export function PlatformRoasChart({ data, blendedRoas }: PlatformRoasChartProps) {
  const sorted = [...data].sort((a, b) => b.roas - a.roas);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          tickFormatter={(v: number) => `${v.toFixed(1)}x`}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="platform"
          width={90}
          tick={{ fontSize: 12, fill: "var(--foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine x={blendedRoas} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, name, item) => {
            if (name === "roas") {
              const p = item.payload as PlatformPerformance;
              return [
                `${Number(value).toFixed(2)}x  ·  ${formatCurrency(p.revenue)} revenue / ${formatCurrency(p.spend)} spend`,
                "ROAS",
              ];
            }
            return [value, name];
          }}
        />
        <Bar dataKey="roas" name="roas" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
          {sorted.map((entry) => (
            <Cell key={entry.platform} fill={entry.roas >= blendedRoas ? "var(--positive)" : "var(--chart-8)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
