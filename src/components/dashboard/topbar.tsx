"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, X } from "lucide-react";
import { useDashboard } from "./dashboard-provider";
import { formatRelativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "cn";

interface TopbarProps {
  title: string;
  description?: string;
}

export function Topbar({ title, description }: TopbarProps) {
  const { lastUpdated, quality, refreshing, error, manualRefresh } = useDashboard();
  const [now, setNow] = useState(() => Date.now());
  const [panelOpen, setPanelOpen] = useState(false);

  // Re-render every 15s purely so the "Last updated: Xs ago" label stays fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const errorCount = quality?.issues.filter((i) => i.severity === "error").length ?? 0;
  const warningCount = quality?.issues.filter((i) => i.severity === "warning").length ?? 0;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur px-6 h-16 shrink-0">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {error && (
          <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-negative">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </span>
        )}

        <div className="relative">
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent transition-colors"
          >
            {quality?.hasCriticalErrors ? (
              <AlertCircle className="h-3.5 w-3.5 text-negative" />
            ) : warningCount > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-positive" />
            )}
            Data Quality
            {quality && (errorCount + warningCount > 0) && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {errorCount + warningCount}
              </Badge>
            )}
          </button>

          {panelOpen && (
            <>
              <button
                aria-label="Close"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setPanelOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-50 w-96 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div>
                    <p className="text-sm font-medium">Data Quality</p>
                    <p className="text-xs text-muted-foreground">
                      {quality ? `${quality.totalDatasets} datasets loaded · ${quality.totalRows.toLocaleString()} rows processed` : "Loading…"}
                    </p>
                  </div>
                  <button onClick={() => setPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <ScrollArea className="max-h-80">
                  <div className="p-3 space-y-2">
                    {quality && quality.issues.length === 0 && (
                      <p className="text-xs text-muted-foreground px-1 py-2">No data-quality issues detected.</p>
                    )}
                    {quality?.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-start gap-2 rounded-md px-2.5 py-2 text-xs",
                          issue.severity === "error" && "bg-negative/10 text-negative",
                          issue.severity === "warning" && "bg-warning/10 text-warning",
                          issue.severity === "info" && "bg-muted text-muted-foreground",
                        )}
                      >
                        {issue.severity === "error" ? (
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        ) : issue.severity === "warning" ? (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-60" />
                        )}
                        <span>
                          <span className="font-medium uppercase text-[10px] tracking-wide opacity-70 mr-1">
                            {issue.dataset}
                          </span>
                          {issue.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <span className="hidden sm:inline text-xs text-muted-foreground">
          {lastUpdated ? `Updated ${formatRelativeTime(lastUpdated, now)}` : "Loading…"}
        </span>

        <button
          onClick={() => manualRefresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing…" : "Refresh Data"}
        </button>
      </div>
    </header>
  );
}
