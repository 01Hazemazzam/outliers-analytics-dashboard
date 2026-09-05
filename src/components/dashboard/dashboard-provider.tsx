"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { RefreshResult, DataQualityReport } from "@/lib/data/types";

interface DashboardContextValue {
  lastUpdated: string | null;
  quality: DataQualityReport | null;
  refreshing: boolean;
  error: string | null;
  /** Increments only when a refresh actually changed at least one dataset — pages use this as an effect dependency to know when to refetch their own data. */
  refreshToken: number;
  manualRefresh: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

const POLL_INTERVAL_MS = 30_000;

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [quality, setQuality] = useState<DataQualityReport | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const inFlight = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      if (!res.ok) throw new Error(`Refresh request failed (HTTP ${res.status}).`);
      const data: RefreshResult = await res.json();
      setLastUpdated(data.lastUpdated);
      setQuality(data.quality);
      setError(null);
      if (data.changed) {
        setRefreshToken((t) => t + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh data.");
    } finally {
      setRefreshing(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial load plus the recurring poll; `check` guards against overlapping
    // in-flight calls via `inFlight`, so this can't cascade into extra renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [check]);

  return (
    <DashboardContext.Provider
      value={{ lastUpdated, quality, refreshing, error, refreshToken, manualRefresh: check }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within a DashboardProvider");
  return ctx;
}
