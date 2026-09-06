import { query, queryOne } from "../db";
import type { NamedValue } from "./executive";

export interface HrFilters {
  department?: string;
  location?: string;
  education?: string;
  performanceRating?: string;
  search?: string;
}

export interface EmployeeRow {
  employee_id: string;
  full_name: string;
  email: string;
  department: string;
  position: string;
  hire_date: string;
  salary: number;
  years_employed: number;
  performance_rating: string;
  bonus_eligible: boolean;
  remote_work: boolean;
  training_hours: number;
  sick_days_used: number;
  vacation_days_used: number;
  location: string;
}

export interface HrKpis {
  totalEmployees: number;
  avgSalary: number;
  avgYearsEmployed: number;
  bonusEligibleRatePercent: number;
  remoteWorkRatePercent: number;
  avgTrainingHours: number;
}

export interface HrAlerts {
  needsImprovementCount: number;
  highSickDaysCount: number;
  lowTrainingCount: number;
  newHireCount: number;
}

export interface HrFilterOptions {
  departments: string[];
  locations: string[];
  educationLevels: string[];
  performanceRatings: string[];
}

export interface HrData {
  kpis: HrKpis;
  alerts: HrAlerts;
  trend: Array<{ month: string; primary: number; secondary: number }>;
  headcountByDepartment: NamedValue[];
  avgSalaryByDepartment: NamedValue[];
  performanceDistribution: NamedValue[];
  remoteWorkRateByDepartment: NamedValue[];
  filterOptions: HrFilterOptions;
}

export interface HrTablePage {
  rows: EmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
}

const SORT_COLUMNS: Record<string, string> = {
  hire_date: "Hire_Date",
  salary: "Salary",
  years_employed: "Years_Employed",
  employee_id: "Employee_ID",
};

function buildWhere(filters: HrFilters): { where: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.department) {
    clauses.push(`Department = ?`);
    params.push(filters.department);
  }
  if (filters.location) {
    clauses.push(`Location = ?`);
    params.push(filters.location);
  }
  if (filters.education) {
    clauses.push(`Education = ?`);
    params.push(filters.education);
  }
  if (filters.performanceRating) {
    clauses.push(`Performance_Rating = ?`);
    params.push(filters.performanceRating);
  }
  if (filters.search) {
    clauses.push(`(Employee_ID ILIKE ? OR First_Name ILIKE ? OR Last_Name ILIKE ? OR Email ILIKE ?)`);
    const like = `%${filters.search}%`;
    params.push(like, like, like, like);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

function round(value: number | null | undefined, decimals = 2): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export async function getHrData(filters: HrFilters): Promise<HrData> {
  const { where, params } = buildWhere(filters);

  const [totals, filterOptionsRaw] = await Promise.all([
    queryOne<{
      total: number;
      avg_salary: number;
      avg_years: number;
      bonus_eligible: number;
      remote: number;
      avg_training: number;
      needs_improvement: number;
      high_sick_days: number;
      low_training: number;
      new_hires: number;
    }>(
      `SELECT COUNT(*) AS total,
              AVG(Salary) AS avg_salary,
              AVG(Years_Employed) AS avg_years,
              SUM(CASE WHEN Bonus_Eligible THEN 1 ELSE 0 END) AS bonus_eligible,
              SUM(CASE WHEN Remote_Work THEN 1 ELSE 0 END) AS remote,
              AVG(Training_Hours) AS avg_training,
              SUM(CASE WHEN Performance_Rating = 'Needs Improvement' THEN 1 ELSE 0 END) AS needs_improvement,
              SUM(CASE WHEN Sick_Days_Used >= 10 THEN 1 ELSE 0 END) AS high_sick_days,
              SUM(CASE WHEN Training_Hours < 10 THEN 1 ELSE 0 END) AS low_training,
              SUM(CASE WHEN Years_Employed < 1 THEN 1 ELSE 0 END) AS new_hires
       FROM employee_hr ${where}`,
      params,
    ),
    Promise.all([
      query<{ v: string }>(`SELECT DISTINCT Department AS v FROM employee_hr ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Location AS v FROM employee_hr ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Education AS v FROM employee_hr ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Performance_Rating AS v FROM employee_hr ORDER BY v`),
    ]),
  ]);

  const [departments, locations, educationLevels, performanceRatings] = filterOptionsRaw;

  const [trendRaw, headcountRaw, avgSalaryRaw, performanceRaw, remoteRaw] = await Promise.all([
    query<{ month: string; avg_salary: number; hires: number }>(
      `SELECT strftime(Hire_Date, '%Y-%m') AS month, AVG(Salary) AS avg_salary, COUNT(*) AS hires
       FROM employee_hr ${where} GROUP BY month ORDER BY month`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Department AS name, COUNT(*) AS value FROM employee_hr ${where} GROUP BY Department ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Department AS name, AVG(Salary) AS value FROM employee_hr ${where} GROUP BY Department ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Performance_Rating AS name, COUNT(*) AS value FROM employee_hr ${where} GROUP BY Performance_Rating ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Department AS name, (SUM(CASE WHEN Remote_Work THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) AS value
       FROM employee_hr ${where} GROUP BY Department ORDER BY value DESC`,
      params,
    ),
  ]);

  const total = totals?.total ?? 0;

  return {
    kpis: {
      totalEmployees: total,
      avgSalary: round(totals?.avg_salary ?? 0, 0),
      avgYearsEmployed: round(totals?.avg_years ?? 0, 1),
      bonusEligibleRatePercent: round(total > 0 ? ((totals?.bonus_eligible ?? 0) / total) * 100 : 0),
      remoteWorkRatePercent: round(total > 0 ? ((totals?.remote ?? 0) / total) * 100 : 0),
      avgTrainingHours: round(totals?.avg_training ?? 0, 1),
    },
    alerts: {
      needsImprovementCount: totals?.needs_improvement ?? 0,
      highSickDaysCount: totals?.high_sick_days ?? 0,
      lowTrainingCount: totals?.low_training ?? 0,
      newHireCount: totals?.new_hires ?? 0,
    },
    trend: trendRaw.map((r) => ({ month: r.month, primary: round(r.avg_salary, 0), secondary: r.hires })),
    headcountByDepartment: headcountRaw.map((r) => ({ name: r.name, value: r.value })),
    avgSalaryByDepartment: avgSalaryRaw.map((r) => ({ name: r.name, value: round(r.value, 0) })),
    performanceDistribution: performanceRaw.map((r) => ({ name: r.name, value: r.value })),
    remoteWorkRateByDepartment: remoteRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    filterOptions: {
      departments: departments.map((c) => c.v),
      locations: locations.map((c) => c.v),
      educationLevels: educationLevels.map((c) => c.v),
      performanceRatings: performanceRatings.map((c) => c.v),
    },
  };
}

export async function getEmployeeRows(
  filters: HrFilters,
  page: number,
  pageSize: number,
  sortBy: string,
  sortDir: "asc" | "desc",
): Promise<HrTablePage> {
  const { where, params } = buildWhere(filters);
  const sortColumn = SORT_COLUMNS[sortBy] ?? "Hire_Date";
  const safeDir = sortDir === "asc" ? "ASC" : "DESC";
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(5, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const [totalRow, rows] = await Promise.all([
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM employee_hr ${where}`, params),
    query<EmployeeRow>(
      `SELECT Employee_ID AS employee_id, (First_Name || ' ' || Last_Name) AS full_name, Email AS email,
              Department AS department, Position AS position, strftime(Hire_Date, '%Y-%m-%d') AS hire_date,
              Salary AS salary, Years_Employed AS years_employed, Performance_Rating AS performance_rating,
              Bonus_Eligible AS bonus_eligible, Remote_Work AS remote_work, Training_Hours AS training_hours,
              Sick_Days_Used AS sick_days_used, Vacation_Days_Used AS vacation_days_used, Location AS location
       FROM employee_hr
       ${where}
       ORDER BY ${sortColumn} ${safeDir}
       LIMIT ? OFFSET ?`,
      [...params, safePageSize, offset],
    ),
  ]);

  return { rows, total: totalRow?.n ?? 0, page: safePage, pageSize: safePageSize };
}
