"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, DollarSign, Megaphone, Target, TrendingUp, Users2 } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { DualTrendChart } from "@/components/dashboard/charts/dual-trend-chart";
import { PillBarList } from "@/components/dashboard/charts/pill-bar-list";
import { BarBreakdownChart } from "@/components/dashboard/charts/bar-breakdown-chart";
import { PlatformRoasChart } from "@/components/dashboard/charts/platform-roas-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { CampaignRow, MarketingData, MarketingFilters, MarketingTablePage } from "@/lib/data/queries/marketing";
import { formatCurrency, formatNumber } from "@/lib/format";

const PAGE_SIZE = 20;

function campaignFlags(row: CampaignRow): Array<{ label: string; tone: "positive" | "negative" | "warning" }> {
  const flags: Array<{ label: string; tone: "positive" | "negative" | "warning" }> = [];
  if (row.spent > row.budget) flags.push({ label: "Overspending", tone: "negative" });
  if (row.roas >= 6) flags.push({ label: "High ROAS", tone: "positive" });
  else if (row.roas < 3) flags.push({ label: "Low ROAS", tone: "warning" });
  if (row.cpa > 150) flags.push({ label: "High CPA", tone: "warning" });
  if (row.conversion_rate_percent >= 8) flags.push({ label: "Strong Conversion", tone: "positive" });
  return flags;
}

export default function MarketingPage() {
  const { refreshToken } = useDashboard();
  const [filters, setFilters] = useState<MarketingFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<MarketingData | null>(null);
  const [rows, setRows] = useState<MarketingTablePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.platform) params.set("platform", filters.platform);
    if (filters.campaignType) params.set("campaignType", filters.campaignType);
    if (filters.industry) params.set("industry", filters.industry);
    if (filters.objective) params.set("objective", filters.objective);
    if (filters.search) params.set("search", filters.search);
    return params.toString();
  }, [filters]);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/marketing?${queryString}`);
      if (!res.ok) throw new Error(`Failed to load marketing data (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setData(payload.data as MarketingData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load marketing data.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  const loadRows = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = new URLSearchParams(queryString);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const res = await fetch(`/api/marketing/campaigns?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load campaigns (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setRows(payload.data as MarketingTablePage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns.");
    } finally {
      setTableLoading(false);
    }
  }, [queryString, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (refreshToken > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadOverview();
      loadRows();
    }
  }, [refreshToken, loadOverview, loadRows]);

  useEffect(() => {
    // Reset to page 1 whenever the filter set changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [filters]);

  const applySearch = () => setFilters((f) => ({ ...f, search: searchInput.trim() || undefined }));
  const resetFilters = () => {
    setFilters({});
    setSearchInput("");
  };
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <Topbar
        title="Marketing"
        description="Campaign-level analytics from marketing_campaigns_data — filters apply to every chart, KPI, and the table below."
      />
      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Card size="sm">
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <FilterSelect
                label="Platform"
                value={filters.platform ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, platform: v || undefined }))}
                options={data?.filterOptions.platforms ?? []}
              />
              <FilterSelect
                label="Campaign Type"
                value={filters.campaignType ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, campaignType: v || undefined }))}
                options={data?.filterOptions.campaignTypes ?? []}
              />
              <FilterSelect
                label="Industry"
                value={filters.industry ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, industry: v || undefined }))}
                options={data?.filterOptions.industries ?? []}
              />
              <FilterSelect
                label="Objective"
                value={filters.objective ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, objective: v || undefined }))}
                options={data?.filterOptions.objectives ?? []}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Search Campaign</label>
                <div className="flex gap-1.5">
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applySearch()}
                    placeholder="CAMP-00123"
                    className="h-7 w-44 text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={applySearch}>
                    Go
                  </Button>
                </div>
              </div>
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" onClick={resetFilters}>
                  Reset filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {loading || !data ? (
            Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Total Budget" value={formatCurrency(data.kpis.totalBudget)} icon={DollarSign} />
              <KpiCard label="Total Spent" value={formatCurrency(data.kpis.totalSpent)} icon={DollarSign} tone="warning" />
              <KpiCard label="Revenue Generated" value={formatCurrency(data.kpis.totalRevenue)} icon={TrendingUp} tone="positive" />
              <KpiCard
                label="Blended ROAS"
                value={`${data.kpis.blendedRoas.toFixed(2)}x`}
                icon={Target}
                tone={data.kpis.blendedRoas >= 3 ? "positive" : "warning"}
              />
              <KpiCard label="Conversions" value={formatNumber(data.kpis.totalConversions)} icon={Megaphone} />
              <KpiCard label="Leads Generated" value={formatNumber(data.kpis.totalLeads)} icon={Users2} />
            </>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Revenue &amp; Spend Trend</CardTitle>
            <CardDescription>Monthly, by campaign Start_Date — matching the filters above</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <DualTrendChart
                data={data.trend}
                primaryLabel="Revenue"
                secondaryLabel="Spend"
                primaryFormatter={(v) => formatCurrency(v)}
                secondaryFormatter={(v) => formatCurrency(v)}
              />
            )}
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>ROAS by Platform</CardTitle>
              <CardDescription>Dashed line marks the blended average</CardDescription>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <PlatformRoasChart data={data.roasByPlatform} blendedRoas={data.kpis.blendedRoas} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Industry</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <BarBreakdownChart data={data.revenueByIndustry} formatValue={(v) => formatCurrency(v)} height={260} />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Avg. CPA by Campaign Type</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <BarBreakdownChart data={data.cpaByType} formatValue={(v) => formatCurrency(v, true)} height={220} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Avg. Conversion Rate by Platform</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <PillBarList data={data.conversionRateByPlatform} formatValue={(v) => `${v.toFixed(2)}%`} />
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>
              Flags: Overspending (Spent &gt; Budget) &middot; High/Low ROAS (&ge;6x / &lt;3x) &middot; High CPA (&gt;$150) &middot; Strong Conversion (&ge;8%)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="text-right">CPA</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableLoading || !rows ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-3.5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : rows.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                        No campaigns match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.rows.map((row) => (
                      <TableRow key={row.campaign_id}>
                        <TableCell>
                          <div className="font-medium">{row.campaign_name}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{row.campaign_id}</div>
                        </TableCell>
                        <TableCell>{row.platform}</TableCell>
                        <TableCell>{row.campaign_type}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.budget, true)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.spent, true)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.revenue_generated, true)}</TableCell>
                        <TableCell className="text-right">{row.roas.toFixed(2)}x</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.cpa, true)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {campaignFlags(row).map((flag) => (
                              <Badge
                                key={flag.label}
                                variant="secondary"
                                className={
                                  flag.tone === "positive"
                                    ? "bg-positive/10 text-positive"
                                    : flag.tone === "negative"
                                      ? "bg-negative/10 text-negative"
                                      : "bg-warning/10 text-warning"
                                }
                              >
                                {flag.label}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {rows && <TablePagination page={rows.page} pageSize={rows.pageSize} total={rows.total} onPageChange={setPage} />}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
