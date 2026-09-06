"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Boxes, PackageX, TrendingUp, Warehouse } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { PillBarList } from "@/components/dashboard/charts/pill-bar-list";
import { BarBreakdownChart } from "@/components/dashboard/charts/bar-breakdown-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { InventoryData, InventoryFilters, InventoryTablePage, ProductRow } from "@/lib/data/queries/inventory";
import { formatCurrency, formatNumber } from "@/lib/format";

const PAGE_SIZE = 20;

function stockStatusBadge(status: string) {
  const tone =
    status === "Out of Stock"
      ? "bg-negative/10 text-negative"
      : status === "Low Stock"
        ? "bg-warning/10 text-warning"
        : status === "Discontinued"
          ? "bg-muted text-muted-foreground"
          : "bg-positive/10 text-positive";
  return (
    <Badge variant="secondary" className={tone}>
      {status}
    </Badge>
  );
}

export default function InventoryPage() {
  const { refreshToken } = useDashboard();
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<InventoryData | null>(null);
  const [rows, setRows] = useState<InventoryTablePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.supplier) params.set("supplier", filters.supplier);
    if (filters.warehouse) params.set("warehouse", filters.warehouse);
    if (filters.stockStatus) params.set("stockStatus", filters.stockStatus);
    if (filters.search) params.set("search", filters.search);
    return params.toString();
  }, [filters]);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/inventory?${queryString}`);
      if (!res.ok) throw new Error(`Failed to load inventory data (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setData(payload.data as InventoryData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventory data.");
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
      const res = await fetch(`/api/inventory/products?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load products (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setRows(payload.data as InventoryTablePage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products.");
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
        title="Inventory"
        description="Product-level analytics from product_inventory_data — filters apply to every chart, KPI, and the table below."
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
                label="Supplier"
                value={filters.supplier ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, supplier: v || undefined }))}
                options={data?.filterOptions.suppliers ?? []}
              />
              <FilterSelect
                label="Warehouse"
                value={filters.warehouse ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, warehouse: v || undefined }))}
                options={data?.filterOptions.warehouses ?? []}
              />
              <FilterSelect
                label="Stock Status"
                value={filters.stockStatus ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, stockStatus: v || undefined }))}
                options={data?.filterOptions.stockStatuses ?? []}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Search Product</label>
                <div className="flex gap-1.5">
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applySearch()}
                    placeholder="PROD-00123"
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
              <KpiCard label="Total Products" value={formatNumber(data.kpis.totalProducts)} icon={Boxes} hint={`${formatNumber(data.kpis.totalStock)} units in stock`} />
              <KpiCard label="Inventory Value" value={formatCurrency(data.kpis.inventoryValue)} icon={Warehouse} hint="Stock × cost price" />
              <KpiCard label="Potential Revenue" value={formatCurrency(data.kpis.potentialRevenue)} icon={TrendingUp} hint="Stock × selling price" />
              <KpiCard
                label="Low Stock"
                value={formatNumber(data.kpis.lowStockCount)}
                icon={PackageX}
                tone={data.kpis.lowStockCount / Math.max(data.kpis.totalProducts, 1) > 0.15 ? "warning" : "neutral"}
                hint="At or below reorder point"
              />
            </>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Alerts</CardTitle>
            <CardDescription>Derived from Current_Stock vs. Reorder_Point / Max_Stock_Level and Stock_Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {loading || !data ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : (
                <>
                  <AlertTile label="Out of Stock" count={data.kpis.outOfStockCount} tone="negative" />
                  <AlertTile label="Low Stock" count={data.kpis.lowStockCount} tone="warning" />
                  <AlertTile label="Overstocked" count={data.kpis.overstockedCount} tone="warning" />
                  <AlertTile label="Discontinued" count={data.kpis.discontinuedCount} tone="neutral" />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Value by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <PillBarList data={data.valueByCategory} formatValue={(v) => formatCurrency(v)} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Stock by Warehouse</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <BarBreakdownChart data={data.stockByWarehouse} formatValue={(v) => formatNumber(v)} height={220} />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Stock Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <BarBreakdownChart data={data.statusDistribution} formatValue={(v) => formatNumber(v)} height={220} multiColor={false} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Inventory Value by Supplier</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <BarBreakdownChart data={data.valueBySupplier} formatValue={(v) => formatCurrency(v)} height={220} />
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>Matches the filters above</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Reorder Pt.</TableHead>
                    <TableHead className="text-right">Inventory Value</TableHead>
                    <TableHead>Status</TableHead>
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
                        No products match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.rows.map((row: ProductRow) => (
                      <TableRow key={row.product_id}>
                        <TableCell>
                          <div className="font-medium">{row.product_name}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{row.product_id}</div>
                        </TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.supplier}</TableCell>
                        <TableCell>{row.warehouse_location}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.current_stock)}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.reorder_point)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.inventory_value, true)}</TableCell>
                        <TableCell>{stockStatusBadge(row.stock_status)}</TableCell>
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
