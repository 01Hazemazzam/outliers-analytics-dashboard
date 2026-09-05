"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DollarSign,
  ShoppingCart,
  Receipt,
  Users,
  Megaphone,
  Warehouse,
  PackageX,
  ShieldAlert,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { RevenueTrendChart } from "@/components/dashboard/charts/revenue-trend-chart";
import { SegmentDonutChart } from "@/components/dashboard/charts/segment-donut-chart";
import { PillBarList } from "@/components/dashboard/charts/pill-bar-list";
import { Sparkline } from "@/components/dashboard/charts/sparkline";
import { RadialGauge } from "@/components/dashboard/charts/radial-gauge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExecutiveOverviewData } from "@/lib/data/queries/executive";
import { formatCurrency, formatNumber } from "@/lib/format";

export default function ExecutiveOverviewPage() {
  const { refreshToken } = useDashboard();
  const [data, setData] = useState<ExecutiveOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/overview");
      if (!res.ok) throw new Error(`Failed to load overview data (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setData(payload.overview as ExecutiveOverviewData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount: `load` guards its own state updates and this effect
    // only re-runs if `load`'s identity changes, so this doesn't cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    // Refetch only when a refresh actually changed a dataset on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (refreshToken > 0) load();
  }, [refreshToken, load]);

  return (
    <>
      <Topbar
        title="Executive Overview"
        description="A cross-domain snapshot — every metric below comes from a single domain's own dataset; see Data Explorer for why domains aren't joined."
      />
      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading || !data ? (
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KpiCardSkeleton key={i} />
            ))}
          </section>
        ) : (
          <Overview data={data} />
        )}
      </main>
    </>
  );
}

function Overview({ data }: { data: ExecutiveOverviewData }) {
  const { kpis } = data;
  const lowStockPct = kpis.totalProducts > 0 ? (kpis.lowStockProducts / kpis.totalProducts) * 100 : 0;
  const topDepartment = data.headcountByDepartment[0];

  return (
    <div className="space-y-6">
      {/* Hero row: revenue is the dominant metric, the rest share equal weight */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card size="sm" className="sm:col-span-2 lg:col-span-2">
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
              <DollarSign className="h-4 w-4 text-positive" />
            </div>
            <p className="mt-1.5 text-3xl font-bold tracking-tight">{formatCurrency(kpis.totalRevenue)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Sum of Final_Amount, sales_ecommerce_data</p>
            <div className="mt-2 h-9">
              <Sparkline data={data.revenueTrend} dataKey="revenue" color="var(--chart-1)" height={36} />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Total Orders</p>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight">{formatNumber(kpis.totalOrders)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Distinct Order_ID</p>
            <div className="mt-2 h-7">
              <Sparkline data={data.revenueTrend} dataKey="orders" color="var(--chart-2)" height={28} />
            </div>
          </CardContent>
        </Card>

        <KpiCard
          label="Avg. Order Value"
          value={formatCurrency(kpis.avgOrderValue, true)}
          icon={Receipt}
          hint="Revenue ÷ orders"
        />
        <KpiCard
          label="Total Customers"
          value={formatNumber(kpis.totalCustomers)}
          icon={Users}
          hint={`${formatNumber(kpis.activeCustomers)} active`}
        />
      </section>

      <InsightsPanel insights={data.insights} />

      {/* Middle: the trend is the largest analytical surface on the page */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue &amp; Orders Trend</CardTitle>
          <CardDescription>Monthly revenue (line) and order volume (bars) — sales_ecommerce_data</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueTrendChart data={data.revenueTrend} />
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
            <CardDescription>sales_ecommerce_data</CardDescription>
          </CardHeader>
          <CardContent>
            <PillBarList data={data.revenueByCategory} formatValue={(v) => formatCurrency(v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Region</CardTitle>
            <CardDescription>sales_ecommerce_data</CardDescription>
          </CardHeader>
          <CardContent>
            <PillBarList data={data.revenueByRegion} formatValue={(v) => formatCurrency(v)} />
          </CardContent>
        </Card>
      </section>

      {/* Lower: compact, secondary, one glance per domain */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card size="sm">
          <CardContent>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Customer Segments</p>
            <SegmentDonutChart data={data.customerSegments} compact />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex flex-col items-center text-center">
            <p className="mb-1 self-start text-xs font-medium text-muted-foreground">Marketing</p>
            <RadialGauge
              value={Math.min(100, (kpis.marketingRoas / 8) * 100)}
              size={84}
              thickness={8}
              color={kpis.marketingRoas >= 3 ? "var(--positive)" : "var(--warning)"}
              label={`${kpis.marketingRoas.toFixed(2)}x`}
              sublabel="ROAS"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {formatCurrency(kpis.totalMarketingSpend)} spent
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Inventory</p>
              <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="mt-1.5 text-xl font-semibold tracking-tight">{formatCurrency(kpis.totalInventoryValue)}</p>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <PackageX className="h-3 w-3 text-warning" />
              {formatNumber(kpis.lowStockProducts)} low stock ({lowStockPct.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex flex-col items-center text-center">
            <p className="mb-1 self-start text-xs font-medium text-muted-foreground">Financial Risk</p>
            <RadialGauge
              value={Math.min(100, kpis.fraudRate * 20)}
              size={84}
              thickness={8}
              color={kpis.fraudRate > 2 ? "var(--negative)" : "var(--chart-1)"}
              label={`${kpis.fraudRate.toFixed(2)}%`}
              sublabel="fraud rate"
            />
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldAlert className="h-3 w-3" /> Is_Fraud = true
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">HR</p>
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight">{formatNumber(kpis.totalEmployees)}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {topDepartment ? `Largest: ${topDepartment.name}` : "employee_hr_data"}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
