"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, DollarSign, Package, Receipt, ShoppingCart, Star } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { RevenueTrendChart } from "@/components/dashboard/charts/revenue-trend-chart";
import { PillBarList } from "@/components/dashboard/charts/pill-bar-list";
import { BarBreakdownChart } from "@/components/dashboard/charts/bar-breakdown-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { SalesData, SalesFilters, SalesOrderRow, SalesTablePage } from "@/lib/data/queries/sales";
import { formatCurrency, formatNumber } from "@/lib/format";

const PAGE_SIZE = 20;

export default function SalesPage() {
  const { refreshToken } = useDashboard();
  const [filters, setFilters] = useState<SalesFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<SalesData | null>(null);
  const [orders, setOrders] = useState<SalesTablePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.region) params.set("region", filters.region);
    if (filters.channel) params.set("channel", filters.channel);
    if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
    if (filters.gender) params.set("gender", filters.gender);
    if (filters.search) params.set("search", filters.search);
    return params.toString();
  }, [filters]);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales?${queryString}`);
      if (!res.ok) throw new Error(`Failed to load sales data (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setData(payload.data as SalesData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sales data.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  const loadOrders = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = new URLSearchParams(queryString);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const res = await fetch(`/api/sales/orders?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load orders (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setOrders(payload.data as SalesTablePage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders.");
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
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (refreshToken > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadOverview();
      loadOrders();
    }
  }, [refreshToken, loadOverview, loadOrders]);

  useEffect(() => {
    // Reset to page 1 whenever the filter set changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [filters]);

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
        title="Sales & E-commerce"
        description="Order-level analytics from sales_ecommerce_data — filters apply to every chart, KPI, and the table below."
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
                label="Category"
                value={filters.category ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, category: v || undefined }))}
                options={data?.filterOptions.categories ?? []}
              />
              <FilterSelect
                label="Region"
                value={filters.region ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, region: v || undefined }))}
                options={data?.filterOptions.regions ?? []}
              />
              <FilterSelect
                label="Sales Channel"
                value={filters.channel ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, channel: v || undefined }))}
                options={data?.filterOptions.channels ?? []}
              />
              <FilterSelect
                label="Payment Method"
                value={filters.paymentMethod ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, paymentMethod: v || undefined }))}
                options={data?.filterOptions.paymentMethods ?? []}
              />
              <FilterSelect
                label="Gender"
                value={filters.gender ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, gender: v || undefined }))}
                options={data?.filterOptions.genders ?? []}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Search Order / Customer ID</label>
                <div className="flex gap-1.5">
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applySearch()}
                    placeholder="ORD-000123"
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
              <KpiCard
                label="Revenue"
                value={formatCurrency(data.kpis.totalRevenue)}
                icon={DollarSign}
                tone="positive"
                hint="Sum of Final_Amount"
              />
              <KpiCard label="Orders" value={formatNumber(data.kpis.totalOrders)} icon={ShoppingCart} hint="Distinct Order_ID" />
              <KpiCard label="Units Sold" value={formatNumber(data.kpis.totalUnits)} icon={Package} hint="Sum of Quantity" />
              <KpiCard label="Avg. Order Value" value={formatCurrency(data.kpis.avgOrderValue, true)} icon={Receipt} />
              <KpiCard label="Total Discount" value={formatCurrency(data.kpis.totalDiscount)} icon={Receipt} tone="warning" />
              <KpiCard
                label="Avg. Satisfaction"
                value={`${data.kpis.avgSatisfaction.toFixed(2)} / 5`}
                icon={Star}
                tone={data.kpis.avgSatisfaction >= 4 ? "positive" : "neutral"}
              />
            </>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Revenue &amp; Orders Trend</CardTitle>
            <CardDescription>Monthly, matching the filters above</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !data ? <Skeleton className="h-[280px] w-full" /> : <RevenueTrendChart data={data.revenueTrend} />}
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <PillBarList data={data.revenueByCategory} formatValue={(v) => formatCurrency(v)} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Region</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <PillBarList data={data.revenueByRegion} formatValue={(v) => formatCurrency(v)} />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Sales Channel</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <BarBreakdownChart data={data.revenueByChannel} formatValue={(v) => formatCurrency(v)} height={220} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <BarBreakdownChart data={data.revenueByPaymentMethod} formatValue={(v) => formatCurrency(v)} height={220} />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Satisfaction Distribution</CardTitle>
              <CardDescription>Customer_Satisfaction, rounded to nearest star</CardDescription>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[160px] w-full" />
              ) : (
                <BarBreakdownChart data={data.satisfactionDistribution} formatValue={(v) => formatNumber(v)} height={160} multiColor={false} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Customer Gender Split</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[160px] w-full" />
              ) : (
                <PillBarList data={data.genderSplit} formatValue={(v) => formatNumber(v)} dense />
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>Matches the filters above &middot; sorted by date, most recent first</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Final Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-right">Satisfaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableLoading || !orders ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 12 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-3.5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : orders.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
                        No orders match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.rows.map((row: SalesOrderRow) => (
                      <TableRow key={row.order_id}>
                        <TableCell className="font-mono text-xs">{row.order_id}</TableCell>
                        <TableCell className="font-mono text-xs">{row.customer_id}</TableCell>
                        <TableCell className="font-mono text-xs">{row.product_id}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell className="text-right">{row.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.discount, true)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.final_amount, true)}</TableCell>
                        <TableCell>{row.order_date}</TableCell>
                        <TableCell>{row.sales_channel}</TableCell>
                        <TableCell>{row.payment_method}</TableCell>
                        <TableCell>{row.region}</TableCell>
                        <TableCell className="text-right">{row.customer_satisfaction.toFixed(1)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {orders && <TablePagination page={orders.page} pageSize={orders.pageSize} total={orders.total} onPageChange={setPage} />}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
