"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeftRight, CreditCard, DollarSign, Gauge, ShieldAlert } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { DualTrendChart } from "@/components/dashboard/charts/dual-trend-chart";
import { PillBarList } from "@/components/dashboard/charts/pill-bar-list";
import { BarBreakdownChart } from "@/components/dashboard/charts/bar-breakdown-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { BankingData, BankingFilters, BankingTablePage, TransactionRow } from "@/lib/data/queries/banking";
import { formatCurrency, formatNumber } from "@/lib/format";

const PAGE_SIZE = 20;

function transactionFlags(row: TransactionRow): Array<{ label: string; tone: "positive" | "negative" | "warning" }> {
  const flags: Array<{ label: string; tone: "positive" | "negative" | "warning" }> = [];
  if (row.is_fraud) flags.push({ label: "Fraud", tone: "negative" });
  if (row.risk_score >= 70) flags.push({ label: "High Risk", tone: "warning" });
  if (row.previous_default) flags.push({ label: "Prior Default", tone: "warning" });
  if (row.credit_score < 580) flags.push({ label: "Poor Credit", tone: "warning" });
  return flags;
}

export default function BankingPage() {
  const { refreshToken } = useDashboard();
  const [filters, setFilters] = useState<BankingFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<BankingData | null>(null);
  const [rows, setRows] = useState<BankingTablePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.transactionType) params.set("transactionType", filters.transactionType);
    if (filters.accountType) params.set("accountType", filters.accountType);
    if (filters.channel) params.set("channel", filters.channel);
    if (filters.city) params.set("city", filters.city);
    if (filters.search) params.set("search", filters.search);
    return params.toString();
  }, [filters]);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/banking?${queryString}`);
      if (!res.ok) throw new Error(`Failed to load banking data (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setData(payload.data as BankingData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load banking data.");
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
      const res = await fetch(`/api/banking/transactions?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load transactions (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setRows(payload.data as BankingTablePage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions.");
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
        title="Banking & Financial"
        description="Transaction-level analytics from banking_financial_data — filters apply to every chart, KPI, and the table below."
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
                label="Transaction Type"
                value={filters.transactionType ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, transactionType: v || undefined }))}
                options={data?.filterOptions.transactionTypes ?? []}
              />
              <FilterSelect
                label="Account Type"
                value={filters.accountType ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, accountType: v || undefined }))}
                options={data?.filterOptions.accountTypes ?? []}
              />
              <FilterSelect
                label="Channel"
                value={filters.channel ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, channel: v || undefined }))}
                options={data?.filterOptions.channels ?? []}
              />
              <FilterSelect
                label="City"
                value={filters.city ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, city: v || undefined }))}
                options={data?.filterOptions.cities ?? []}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Search Transaction</label>
                <div className="flex gap-1.5">
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applySearch()}
                    placeholder="TXN-00000123"
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
              <KpiCard label="Total Transactions" value={formatNumber(data.kpis.totalTransactions)} icon={ArrowLeftRight} />
              <KpiCard label="Total Volume" value={formatCurrency(data.kpis.totalVolume)} icon={DollarSign} />
              <KpiCard label="Avg. Transaction" value={formatCurrency(data.kpis.avgTransactionAmount, true)} icon={DollarSign} />
              <KpiCard
                label="Fraud Rate"
                value={`${data.kpis.fraudRatePercent.toFixed(2)}%`}
                icon={ShieldAlert}
                tone={data.kpis.fraudRatePercent > 2 ? "negative" : "neutral"}
              />
              <KpiCard label="Avg. Risk Score" value={data.kpis.avgRiskScore.toFixed(1)} icon={Gauge} hint="0–100 scale" />
              <KpiCard label="Avg. Credit Score" value={formatNumber(data.kpis.avgCreditScore)} icon={CreditCard} hint="FICO 300–850 scale" />
            </>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Risk Indicators</CardTitle>
            <CardDescription>
              Fraud (Is_Fraud) &middot; High Risk (Risk_Score &ge; 70) &middot; Prior Default (Previous_Default) &middot; Poor Credit (Credit_Score &lt; 580, FICO &quot;Poor&quot; band)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {loading || !data ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : (
                <>
                  <AlertTile label="Fraudulent" count={data.alerts.fraudCount} tone="negative" />
                  <AlertTile label="High Risk" count={data.alerts.highRiskCount} tone="warning" />
                  <AlertTile label="Prior Default" count={data.alerts.previousDefaultCount} tone="warning" />
                  <AlertTile label="Poor Credit" count={data.alerts.poorCreditCount} tone="warning" />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume &amp; Fraud Trend</CardTitle>
            <CardDescription>Monthly, by Transaction_Date — matching the filters above</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <DualTrendChart
                data={data.trend}
                primaryLabel="Volume"
                secondaryLabel="Fraud Count"
                primaryFormatter={(v) => formatCurrency(v)}
                secondaryFormatter={(v) => formatNumber(v)}
              />
            )}
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Volume by Transaction Type</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <BarBreakdownChart data={data.volumeByTransactionType} formatValue={(v) => formatCurrency(v)} height={260} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Volume by Account Type</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <BarBreakdownChart data={data.volumeByAccountType} formatValue={(v) => formatCurrency(v)} height={260} />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Fraud Rate by Channel</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <PillBarList data={data.fraudRateByChannel} formatValue={(v) => `${v.toFixed(2)}%`} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Avg. Risk Score by City</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <BarBreakdownChart data={data.avgRiskScoreByCity} formatValue={(v) => v.toFixed(1)} height={220} multiColor={false} />
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Matches the filters above</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                    <TableHead className="text-right">Credit Score</TableHead>
                    <TableHead className="text-right">Risk Score</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableLoading || !rows ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-3.5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : rows.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No transactions match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.rows.map((row) => (
                      <TableRow key={row.transaction_id}>
                        <TableCell>
                          <div className="font-mono text-[11px] text-muted-foreground">{row.transaction_id}</div>
                          <div className="text-xs text-muted-foreground">{row.transaction_date}</div>
                        </TableCell>
                        <TableCell>{row.transaction_type}</TableCell>
                        <TableCell>{row.channel}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.amount, true)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.account_balance_after, true)}</TableCell>
                        <TableCell className="text-right">{row.credit_score}</TableCell>
                        <TableCell className="text-right">{row.risk_score}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {transactionFlags(row).map((flag) => (
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

function AlertTile({ label, count, tone }: { label: string; count: number; tone: "negative" | "warning" | "neutral" }) {
  const toneClasses =
    tone === "negative" ? "border-negative/30 bg-negative/5 text-negative" : tone === "warning" ? "border-warning/30 bg-warning/5 text-warning" : "border-border bg-muted/40 text-muted-foreground";
  return (
    <div className={`rounded-lg border px-3 py-3 ${toneClasses}`}>
      <p className="text-2xl font-bold tracking-tight">{formatNumber(count)}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}
