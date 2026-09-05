"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDashboard } from "./dashboard-provider";
import { formatNumber } from "@/lib/format";

export function Sidebar() {
  const pathname = usePathname();
  const { quality } = useDashboard();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <BarChart3 className="h-4.5 w-4.5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Outliers Analytics</p>
          <p className="text-[11px] text-sidebar-foreground/50">Business Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.enabled && pathname === item.href;
          const Icon = item.icon;

          const rowClasses = cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : item.enabled
                ? "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                : "text-sidebar-foreground/30 cursor-not-allowed",
          );

          if (!item.enabled) {
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger className={cn(rowClasses, "w-full text-left")}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="text-[10px] uppercase tracking-wide rounded bg-sidebar-foreground/10 px-1.5 py-0.5">
                    Soon
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right">Available in a later build phase</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link key={item.key} href={item.href} className={rowClasses}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/40">
        {quality
          ? `${quality.totalDatasets} datasets · ${formatNumber(quality.totalRows)} rows`
          : "Loading dataset stats…"}
      </div>
    </aside>
  );
}
