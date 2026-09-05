"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Users, UserCheck, Gem, Wallet } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { PillBarList } from "@/components/dashboard/charts/pill-bar-list";
import { SegmentDonutChart } from "@/components/dashboard/charts/segment-donut-chart";
import { RadialGauge } from "@/components/dashboard/charts/radial-gauge";
import { BarBreakdownChart } from "@/components/dashboard/charts/bar-breakdown-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CustomerData, CustomerFilters, CustomerProfile, CustomerRow, CustomerTablePage } from "@/lib/data/queries/customers";
import { formatCurrency, formatNumber } from "@/lib/format";

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const { refreshToken } = useDashboard();
  const [filters, setFilters] = useState<CustomerFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [data, setData] = useState<CustomerData | null>(null);
  const [rows, setRows] = useState<CustomerTablePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.segment) params.set("segment", filters.segment);
    if (filters.status) params.set("status", filters.status);
    if (filters.country) params.set("country", filters.country);
    if (filters.industry) params.set("industry", filters.industry);
    if (filters.acquisitionSource) params.set("acquisitionSource", filters.acquisitionSource);
    if (filters.search) params.set("search", filters.search);
    return params.toString();
  }, [filters]);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers?${queryString}`);
      if (!res.ok) throw new Error(`Failed to load customer data (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setData(payload.data as CustomerData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customer data.");
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
      const res = await fetch(`/api/customers/rows?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load customers (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setRows(payload.data as CustomerTablePage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers.");
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

  useEffect(() => {
    // Fetch the selected customer's profile; guards its own loading state.
    if (!selectedCustomerId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    fetch(`/api/customers/${selectedCustomerId}`)
      .then((res) => res.json())
      .then((payload) => {
        if (!payload.error) setProfile(payload.data as CustomerProfile);
      })
      .finally(() => setProfileLoading(false));
  }, [selectedCustomerId]);

  const applySearch = () => {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined }));
  };

  const resetFilters = () => {
    setFilters({});
    setSearchInput("");
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <Topbar
        title="Customers"
        description="customer_demographics_data only — not joined with sales or banking (see Data Explorer for why)."
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
                label="Segment"
                value={filters.segment ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, segment: v || undefined }))}
                options={data?.filterOptions.segments ?? []}
              />
              <FilterSelect
                label="Status"
                value={filters.status ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, status: v || undefined }))}
                options={data?.filterOptions.statuses ?? []}
              />
              <FilterSelect
                label="Country"
                value={filters.country ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, country: v || undefined }))}
                options={data?.filterOptions.countries ?? []}
              />
              <FilterSelect
                label="Industry"
                value={filters.industry ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, industry: v || undefined }))}
                options={data?.filterOptions.industries ?? []}
              />
              <FilterSelect
                label="Acquisition Source"
                value={filters.acquisitionSource ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, acquisitionSource: v || undefined }))}
                options={data?.filterOptions.acquisitionSources ?? []}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Search Customer ID</label>
                <div className="flex gap-1.5">
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applySearch()}
                    placeholder="CUST-000123"
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

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {loading || !data ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                label="Matched Customers"
                value={formatNumber(data.kpis.totalCustomers)}
                icon={Users}
                hint={`${formatNumber(data.kpis.activeCustomers)} active`}
              />
              <KpiCard label="Active Customers" value={formatNumber(data.kpis.activeCustomers)} icon={UserCheck} />
              <KpiCard label="Avg. Lifetime Value" value={formatCurrency(data.kpis.avgClv, true)} icon={Gem} />
              <KpiCard label="Avg. Total Spent" value={formatCurrency(data.kpis.avgTotalSpent, true)} icon={Wallet} />
            </>
          )}
        </section>

        {data && data.insights.length > 0 && <InsightsPanel insights={data.insights} />}

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Customers by Segment</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <PillBarList data={data.segmentCounts} formatValue={(v) => formatNumber(v)} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Avg. Lifetime Value by Segment</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <PillBarList data={data.segmentAvgClv} formatValue={(v) => formatCurrency(v, true)} />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Card size="sm">
            <CardContent>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Status</p>
              {loading || !data ? <Skeleton className="h-[110px] w-full" /> : <SegmentDonutChart data={data.statusBreakdown} compact />}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="flex flex-col items-center text-center">
              <p className="mb-1 self-start text-xs font-medium text-muted-foreground">Churn Risk</p>
              {loading || !data ? (
                <Skeleton className="h-[84px] w-[84px] rounded-full" />
              ) : (
                <RadialGauge
                  value={data.kpis.avgChurnRisk}
                  size={84}
                  thickness={8}
                  color={data.kpis.avgChurnRisk > 60 ? "var(--warning)" : "var(--chart-1)"}
                  label={data.kpis.avgChurnRisk.toFixed(0)}
                  sublabel="avg score"
                />
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Countries</p>
              {loading || !data ? (
                <Skeleton className="h-[110px] w-full" />
              ) : (
                <PillBarList data={data.countryBreakdown} formatValue={(v) => formatNumber(v)} dense />
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Acquisition Source</p>
              {loading || !data ? (
                <Skeleton className="h-[110px] w-full" />
              ) : (
                <PillBarList data={data.acquisitionBreakdown} formatValue={(v) => formatNumber(v)} dense />
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">NPS</p>
              </div>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight">{loading || !data ? "—" : data.kpis.avgNps.toFixed(1)}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">Net_Promoter_Score, scale 0–9</p>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>NPS Distribution</CardTitle>
            <CardDescription>Raw Net_Promoter_Score counts, matching the filters above</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <BarBreakdownChart data={data.npsDistribution} formatValue={(v) => formatNumber(v)} height={180} multiColor={false} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
            <CardDescription>Click a row to view the full demographic profile</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer ID</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Age</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead className="text-right">CLV</TableHead>
                    <TableHead className="text-right">Churn Risk</TableHead>
                    <TableHead className="text-right">NPS</TableHead>
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
                        No customers match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.rows.map((row: CustomerRow) => (
                      <TableRow
                        key={row.customer_id}
                        className="cursor-pointer"
                        onClick={() => setSelectedCustomerId(row.customer_id)}
                      >
                        <TableCell className="font-mono text-xs">{row.customer_id}</TableCell>
                        <TableCell>{row.segment}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{row.country}</TableCell>
                        <TableCell className="text-right">{row.age}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.total_spent, true)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.clv, true)}</TableCell>
                        <TableCell className="text-right">{row.churn_risk_score.toFixed(0)}</TableCell>
                        <TableCell className="text-right">{row.nps}</TableCell>
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

      <Dialog open={!!selectedCustomerId} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">{selectedCustomerId}</DialogTitle>
            <DialogDescription>
              Demographic profile from customer_demographics_data only — no sales or banking activity is merged in.
            </DialogDescription>
          </DialogHeader>
          {profileLoading || !profile ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-2 text-sm">
              <Field label="Segment"><Badge variant="secondary">{profile.segment}</Badge></Field>
              <Field label="Status"><Badge variant="secondary">{profile.status}</Badge></Field>
              <Field label="Country" value={profile.country} />
              <Field label="Industry" value={profile.industry} />
              <Field label="Age" value={String(profile.age)} />
              <Field label="Annual Income" value={profile.annual_income != null ? formatCurrency(profile.annual_income) : "—"} />
              <Field label="Total Spent" value={formatCurrency(profile.total_spent)} />
              <Field label="Lifetime Value" value={formatCurrency(profile.clv)} />
              <Field label="Number of Orders" value={String(profile.number_of_orders)} />
              <Field label="Churn Risk Score" value={profile.churn_risk_score.toFixed(1)} />
              <Field label="NPS" value={String(profile.nps)} />
              <Field label="Acquisition Source" value={profile.acquisition_source} />
              <Field label="Marketing Emails Opened" value={String(profile.marketing_emails_opened)} />
              <Field label="Website Sessions" value={String(profile.website_sessions)} />
              <Field label="Mobile App User" value={profile.mobile_app_user ? "Yes" : "No"} />
              <Field label="Newsletter Subscriber" value={profile.newsletter_subscriber ? "Yes" : "No"} />
              <Field label="Referral Count" value={String(profile.referral_count)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="mt-0.5 font-medium">{children ?? value}</div>
    </div>
  );
}
