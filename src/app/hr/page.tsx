"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Award, Clock, DollarSign, GraduationCap, Home, Users2 } from "lucide-react";
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
import type { EmployeeRow, HrData, HrFilters, HrTablePage } from "@/lib/data/queries/hr";
import { formatCurrency, formatNumber } from "@/lib/format";

const PAGE_SIZE = 20;

function employeeFlags(row: EmployeeRow): Array<{ label: string; tone: "positive" | "negative" | "warning" }> {
  const flags: Array<{ label: string; tone: "positive" | "negative" | "warning" }> = [];
  if (row.performance_rating === "Needs Improvement") flags.push({ label: "Needs Improvement", tone: "warning" });
  if (row.performance_rating === "Outstanding") flags.push({ label: "Outstanding", tone: "positive" });
  if (row.sick_days_used >= 10) flags.push({ label: "High Sick Days", tone: "warning" });
  if (row.training_hours < 10) flags.push({ label: "Low Training", tone: "warning" });
  if (row.years_employed < 1) flags.push({ label: "New Hire", tone: "positive" });
  return flags;
}

export default function HrPage() {
  const { refreshToken } = useDashboard();
  const [filters, setFilters] = useState<HrFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<HrData | null>(null);
  const [rows, setRows] = useState<HrTablePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.department) params.set("department", filters.department);
    if (filters.location) params.set("location", filters.location);
    if (filters.education) params.set("education", filters.education);
    if (filters.performanceRating) params.set("performanceRating", filters.performanceRating);
    if (filters.search) params.set("search", filters.search);
    return params.toString();
  }, [filters]);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/hr?${queryString}`);
      if (!res.ok) throw new Error(`Failed to load HR data (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setData(payload.data as HrData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load HR data.");
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
      const res = await fetch(`/api/hr/employees?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load employees (HTTP ${res.status}).`);
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      setRows(payload.data as HrTablePage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load employees.");
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
        title="HR / Employees"
        description="Employee-level analytics from employee_hr_data — filters apply to every chart, KPI, and the table below."
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
                label="Department"
                value={filters.department ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, department: v || undefined }))}
                options={data?.filterOptions.departments ?? []}
              />
              <FilterSelect
                label="Location"
                value={filters.location ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, location: v || undefined }))}
                options={data?.filterOptions.locations ?? []}
              />
              <FilterSelect
                label="Education"
                value={filters.education ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, education: v || undefined }))}
                options={data?.filterOptions.educationLevels ?? []}
              />
              <FilterSelect
                label="Performance"
                value={filters.performanceRating ?? ""}
                onChange={(v) => setFilters((f) => ({ ...f, performanceRating: v || undefined }))}
                options={data?.filterOptions.performanceRatings ?? []}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Search Employee</label>
                <div className="flex gap-1.5">
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applySearch()}
                    placeholder="EMP-00123 or name"
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
              <KpiCard label="Total Employees" value={formatNumber(data.kpis.totalEmployees)} icon={Users2} />
              <KpiCard label="Avg. Salary" value={formatCurrency(data.kpis.avgSalary)} icon={DollarSign} />
              <KpiCard label="Avg. Years Employed" value={data.kpis.avgYearsEmployed.toFixed(1)} icon={Clock} />
              <KpiCard label="Bonus Eligible" value={`${data.kpis.bonusEligibleRatePercent.toFixed(1)}%`} icon={Award} />
              <KpiCard label="Remote Work" value={`${data.kpis.remoteWorkRatePercent.toFixed(1)}%`} icon={Home} />
              <KpiCard label="Avg. Training Hours" value={data.kpis.avgTrainingHours.toFixed(1)} icon={GraduationCap} />
            </>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Workforce Indicators</CardTitle>
            <CardDescription>
              Needs Improvement (Performance_Rating) &middot; High Sick Days (&ge;10 used) &middot; Low Training (&lt;10 hours) &middot; New Hire (Years_Employed &lt; 1)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {loading || !data ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : (
                <>
                  <AlertTile label="Needs Improvement" count={data.alerts.needsImprovementCount} tone="warning" />
                  <AlertTile label="High Sick Days" count={data.alerts.highSickDaysCount} tone="warning" />
                  <AlertTile label="Low Training" count={data.alerts.lowTrainingCount} tone="warning" />
                  <AlertTile label="New Hires" count={data.alerts.newHireCount} tone="neutral" />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hiring &amp; Compensation Trend</CardTitle>
            <CardDescription>Monthly, by Hire_Date — matching the filters above</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <DualTrendChart
                data={data.trend}
                primaryLabel="Avg. Salary"
                secondaryLabel="New Hires"
                primaryFormatter={(v) => formatCurrency(v)}
                secondaryFormatter={(v) => formatNumber(v)}
              />
            )}
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Headcount by Department</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <BarBreakdownChart data={data.headcountByDepartment} formatValue={(v) => formatNumber(v)} height={260} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Avg. Salary by Department</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <BarBreakdownChart data={data.avgSalaryByDepartment} formatValue={(v) => formatCurrency(v)} height={260} />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Performance Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <BarBreakdownChart data={data.performanceDistribution} formatValue={(v) => formatNumber(v)} height={220} multiColor={false} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Remote Work Rate by Department</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <PillBarList data={data.remoteWorkRateByDepartment} formatValue={(v) => `${v.toFixed(1)}%`} />
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Employees</CardTitle>
            <CardDescription>Matches the filters above</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Salary</TableHead>
                    <TableHead className="text-right">Years</TableHead>
                    <TableHead>Performance</TableHead>
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
                        No employees match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.rows.map((row) => (
                      <TableRow key={row.employee_id}>
                        <TableCell>
                          <div className="font-medium">{row.full_name}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{row.employee_id}</div>
                        </TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.position}</TableCell>
                        <TableCell>{row.location}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.salary, true)}</TableCell>
                        <TableCell className="text-right">{row.years_employed.toFixed(1)}</TableCell>
                        <TableCell>{row.performance_rating}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {employeeFlags(row).map((flag) => (
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
