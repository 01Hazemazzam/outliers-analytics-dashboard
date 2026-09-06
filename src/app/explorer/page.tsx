"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Download,
  ShieldAlert,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import type { DatasetKey } from "@/lib/data/config";
import type { ExplorerSchema, ExplorerTablePage } from "@/lib/data/queries/explorer";
import { formatNumber } from "@/lib/format";

const PAGE_SIZE = 20;

const DATASET_OPTIONS: Array<{ key: DatasetKey; label: string }> = [
  { key: "sales", label: "Sales & E-commerce" },
  { key: "customers", label: "Customers" },
  { key: "marketing", label: "Marketing" },
  { key: "inventory", label: "Inventory" },
  { key: "banking", label: "Banking & Financial" },
  { key: "hr", label: "HR / Employees" },
];

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return String(value);
}

function RelationshipDiagram() {
  const groups = [
    {
      idColumn: "Customer_ID",
      datasets: ["customer_demographics_data", "sales_ecommerce_data", "banking_financial_data"],
      finding: "1.5–1.7% agreement when joined and compared against Age — consistent with random chance, not a real match.",
    },
    {
      idColumn: "Product_ID",
      datasets: ["product_inventory_data", "sales_ecommerce_data"],
      finding: "89% mismatch when joined and compared against Category — consistent with random chance (1-in-8 categories), not a real match.",
    },
  ];

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.idColumn} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {group.datasets.map((name, i) => (
              <div key={name} className="flex items-center gap-2">
                <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5 font-mono text-[11px]">
                  {name}
                </span>
                {i < group.datasets.length - 1 && (
                  <span className="text-muted-foreground/50 text-xs">┄┄ {group.idColumn} ┄┄▶</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{group.finding}</p>
        </div>
      ))}
    </div>
  );
}

export default function ExplorerPage() {
  const { quality } = useDashboard();
  const [dataset, setDataset] = useState<DatasetKey>("sales");
  const [schema, setSchema] = useState<ExplorerSchema | null>(null);
  const [rows, setRows] = useState<ExplorerTablePage | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [loadingRows, setLoadingRows] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterColumn, setFilterColumn] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [filterOptions, setFilterOptions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const selectDataset = (key: DatasetKey) => {
    if (key === dataset) return;
    setDataset(key);
    setSearchInput("");
    setSearch("");
    setFilterColumn("");
    setFilterValue("");
    setFilterOptions([]);
    setSortBy(undefined);
    setSortDir("desc");
    setPage(1);
  };

  const loadSchema = useCallback(async () => {
    setLoadingSchema(true);
    try {
      const res = await fetch(`/api/explorer/schema?dataset=${dataset}`);
      if (!res.ok) throw new Error(`Failed to load dataset schema (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setSchema(payload.data as ExplorerSchema);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dataset schema.");
    } finally {
      setLoadingSchema(false);
    }
  }, [dataset]);

  const rowsQueryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("dataset", dataset);
    if (search) params.set("search", search);
    if (filterColumn && filterValue) {
      params.set("filterColumn", filterColumn);
      params.set("filterValue", filterValue);
    }
    if (sortBy) {
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
    }
    return params.toString();
  }, [dataset, search, filterColumn, filterValue, sortBy, sortDir]);

  const loadRows = useCallback(async () => {
    setLoadingRows(true);
    try {
      const params = new URLSearchParams(rowsQueryString);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const res = await fetch(`/api/explorer/rows?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load rows (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setRows(payload.data as ExplorerTablePage);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rows.");
    } finally {
      setLoadingRows(false);
    }
  }, [rowsQueryString, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSchema();
  }, [loadSchema]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    // Reset to page 1 whenever the filter/search/sort set changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [dataset, search, filterColumn, filterValue, sortBy, sortDir]);

  useEffect(() => {
    if (!filterColumn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilterOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/explorer/distinct?dataset=${dataset}&column=${encodeURIComponent(filterColumn)}`);
        const payload = await res.json();
        if (!cancelled && !payload.error) setFilterOptions(payload.data as string[]);
      } catch {
        // Non-critical: the value dropdown just stays empty if this fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataset, filterColumn]);

  const applySearch = () => setSearch(searchInput.trim());
  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setFilterColumn("");
    setFilterValue("");
  };
  const hasActiveFilters = Boolean(search || filterColumn);

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const handleExport = () => {
    setExporting(true);
    const params = new URLSearchParams(rowsQueryString);
    const link = document.createElement("a");
    link.href = `/api/explorer/export?${params.toString()}`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => setExporting(false), 1500);
  };

  const datasetIssues = quality?.issues.filter((i) => i.dataset === dataset) ?? [];

  return (
    <>
      <Topbar
        title="Data Explorer"
        description="Browse any of the six source datasets directly — no cross-dataset joins are performed here or anywhere else in the dashboard."
      />
      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            ⚠️ Relationship candidates detected by column naming, but referential integrity was not established in the
            current data. Cross-dataset joins are intentionally disabled.
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-card p-1.5">
          {DATASET_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => selectDataset(opt.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                dataset === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card size="sm">
            <CardContent>
              <p className="text-xs font-medium text-muted-foreground">Rows</p>
              <div className="mt-1.5 text-2xl font-semibold tracking-tight">
                {loadingSchema || !schema ? <Skeleton className="h-7 w-20" /> : formatNumber(schema.rowCount)}
              </div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <p className="text-xs font-medium text-muted-foreground">Columns</p>
              <div className="mt-1.5 text-2xl font-semibold tracking-tight">
                {loadingSchema || !schema ? <Skeleton className="h-7 w-12" /> : schema.columns.length}
              </div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <p className="text-xs font-medium text-muted-foreground">Source File</p>
              <div className="mt-1.5 truncate font-mono text-xs">
                {loadingSchema || !schema ? <Skeleton className="h-5 w-32" /> : schema.filename}
              </div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <p className="text-xs font-medium text-muted-foreground">Data Quality</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium">
                {datasetIssues.length === 0 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-positive" /> No issues
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-warning" /> {datasetIssues.length} issue
                    {datasetIssues.length === 1 ? "" : "s"}
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Columns &amp; Types</CardTitle>
              <CardDescription>Schema of {schema?.table ?? "…"}, read directly from DuckDB</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSchema || !schema ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {schema.columns.map((c) => (
                    <span
                      key={c.name}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px]"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground">{c.type}</span>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Quality Notes</CardTitle>
              <CardDescription>Issues detected for this dataset during ingestion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {datasetIssues.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data-quality issues detected for this dataset.</p>
              ) : (
                datasetIssues.map((issue, idx) => (
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
                    <span>{issue.message}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Data Model — Relationship Candidates</CardTitle>
            <CardDescription>Shared ID naming across datasets, verified and rejected as real foreign keys</CardDescription>
          </CardHeader>
          <CardContent>
            <RelationshipDiagram />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <FilterSelect
                label="Filter Column"
                value={filterColumn}
                onChange={(v) => {
                  setFilterColumn(v);
                  setFilterValue("");
                }}
                options={schema?.columns.map((c) => c.name) ?? []}
              />
              <FilterSelect
                label="Filter Value"
                value={filterValue}
                onChange={(v) => setFilterValue(v)}
                options={filterOptions}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Search (all columns)</label>
                <div className="flex gap-1.5">
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applySearch()}
                    placeholder="Search any column…"
                    className="h-7 w-52 text-xs"
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
              <div className="ml-auto">
                <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
                  <Download className="h-3.5 w-3.5" />
                  {exporting ? "Exporting…" : "Export CSV"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rows</CardTitle>
            <CardDescription>Matches the filters above &middot; click a column header to sort</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {(schema?.columns ?? []).map((c) => (
                      <TableHead key={c.name}>
                        <button
                          onClick={() => toggleSort(c.name)}
                          className="inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground"
                        >
                          {c.name}
                          {sortBy === c.name ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRows || !rows ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {(schema?.columns ?? Array.from({ length: 6 })).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-3.5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : rows.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={rows.columns.length || 1} className="py-8 text-center text-muted-foreground">
                        No rows match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.rows.map((row, i) => (
                      <TableRow key={i}>
                        {rows.columns.map((c) => (
                          <TableCell key={c.name} className="whitespace-nowrap">
                            {formatCell(row[c.name])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {rows && <TablePagination page={rows.page} pageSize={rows.pageSize} total={rows.total} onPageChange={setPage} />}
          </CardContent>
        </Card>

        {quality && (
          <p className="text-[11px] text-muted-foreground">
            <Badge variant="secondary" className="mr-1.5 align-middle">
              {quality.totalDatasets} datasets
            </Badge>
            {formatNumber(quality.totalRows)} rows across all datasets combined — each dataset above is queried
            independently; none of these rows are joined across datasets.
          </p>
        )}
      </main>
    </>
  );
}
