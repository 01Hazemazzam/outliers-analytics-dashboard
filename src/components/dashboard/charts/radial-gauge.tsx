"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { cn } from "cn";

interface RadialGaugeProps {
  /** 0-100 */
  value: number;
  size?: number;
  color?: string;
  trackColor?: string;
  thickness?: number;
  label?: string;
  sublabel?: string;
  /** Semi-circle gauge instead of a full ring. */
  half?: boolean;
}

export function RadialGauge({
  value,
  size = 120,
  color = "var(--chart-1)",
  trackColor = "var(--muted)",
  thickness = 10,
  label,
  sublabel,
  half = false,
}: RadialGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const data = [{ value: clamped }];
  const height = half ? Math.round(size / 1.7) : size;

  return (
    <div className="relative" style={{ width: size, height }}>
      <RadialBarChart
        width={size}
        height={height}
        cx="50%"
        cy={half ? "100%" : "50%"}
        innerRadius={size / 2 - thickness - 4}
        outerRadius={size / 2 - 4}
        startAngle={half ? 180 : 90}
        endAngle={half ? 0 : -270}
        barSize={thickness}
        data={data}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
        <RadialBar
          dataKey="value"
          background={{ fill: trackColor }}
          cornerRadius={thickness / 2}
          fill={color}
          isAnimationActive={false}
        />
      </RadialBarChart>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex flex-col items-center justify-center",
          half && "justify-end pb-0.5",
        )}
      >
        {label && <span className="text-lg font-semibold leading-none">{label}</span>}
        {sublabel && <span className="mt-0.5 text-[10px] text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
