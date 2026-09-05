import { query, queryOne } from "../db";
import type { NamedValue } from "./executive";

export interface CustomerFilters {
  segment?: string;
  status?: string;
  country?: string;
  industry?: string;
  acquisitionSource?: string;
  search?: string;
}

export interface CustomerRow {
  customer_id: string;
  segment: string;
  status: string;
  country: string;
  industry: string;
  age: number;
  total_spent: number;
  clv: number;
  churn_risk_score: number;
  nps: number;
  acquisition_source: string;
}

export interface CustomerProfile extends CustomerRow {
  annual_income: number | null;
  number_of_orders: number;
  marketing_emails_opened: number;
  website_sessions: number;
  mobile_app_user: boolean;
  newsletter_subscriber: boolean;
  referral_count: number;
}

export interface CustomerKpis {
  totalCustomers: number;
  activeCustomers: number;
  avgClv: number;
  avgTotalSpent: number;
  avgChurnRisk: number;
  avgNps: number;
}

export interface SegmentStat {
  name: string;
  count: number;
  avgClv: number;
}

export interface CustomerFilterOptions {
  segments: string[];
  statuses: string[];
  countries: string[];
  industries: string[];
  acquisitionSources: string[];
}

export interface CustomerData {
  kpis: CustomerKpis;
  segmentCounts: NamedValue[];
  segmentAvgClv: NamedValue[];
  statusBreakdown: NamedValue[];
  countryBreakdown: NamedValue[];
  acquisitionBreakdown: NamedValue[];
  npsDistribution: NamedValue[];
  filterOptions: CustomerFilterOptions;
  insights: Array<{ id: string; text: string; sentiment: "positive" | "negative" | "neutral" | "warning" }>;
}

export interface CustomerTablePage {
  rows: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
}

const SORT_COLUMNS: Record<string, string> = {
  customer_id: "Customer_ID",
  total_spent: "Total_Spent",
  clv: "Customer_Lifetime_Value",
  churn_risk_score: "Churn_Risk_Score",
  nps: "Net_Promoter_Score",
  age: "Age",
};

function buildWhere(filters: CustomerFilters): { where: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.segment) {
    clauses.push(`Customer_Segment = ?`);
    params.push(filters.segment);
  }
  if (filters.status) {
    clauses.push(`Customer_Status = ?`);
    params.push(filters.status);
  }
  if (filters.country) {
    clauses.push(`Country = ?`);
    params.push(filters.country);
  }
  if (filters.industry) {
    clauses.push(`Industry = ?`);
    params.push(filters.industry);
  }
  if (filters.acquisitionSource) {
    clauses.push(`Acquisition_Source = ?`);
    params.push(filters.acquisitionSource);
  }
  if (filters.search) {
    clauses.push(`Customer_ID ILIKE ?`);
    params.push(`%${filters.search}%`);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

function round(value: number | null | undefined, decimals = 2): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export async function getCustomerData(filters: CustomerFilters): Promise<CustomerData> {
  const { where, params } = buildWhere(filters);

  const [totals, filterOptionsRaw] = await Promise.all([
    queryOne<{ total: number; active: number; avg_clv: number; avg_spent: number; avg_churn: number; avg_nps: number }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN Customer_Status = 'Active' THEN 1 ELSE 0 END) AS active,
              AVG(Customer_Lifetime_Value) AS avg_clv,
              AVG(Total_Spent) AS avg_spent,
              AVG(Churn_Risk_Score) AS avg_churn,
              AVG(Net_Promoter_Score) AS avg_nps
       FROM customer_demographics ${where}`,
      params,
    ),
    Promise.all([
      query<{ v: string }>(`SELECT DISTINCT Customer_Segment AS v FROM customer_demographics ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Customer_Status AS v FROM customer_demographics ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Country AS v FROM customer_demographics ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Industry AS v FROM customer_demographics ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Acquisition_Source AS v FROM customer_demographics ORDER BY v`),
    ]),
  ]);

  const [segments, statuses, countries, industries, acquisitionSources] = filterOptionsRaw;

  const [segmentCountRaw, segmentClvRaw, statusRaw, countryRaw, acquisitionRaw, npsRaw] = await Promise.all([
    query<{ name: string; value: number }>(
      `SELECT Customer_Segment AS name, COUNT(*) AS value FROM customer_demographics ${where} GROUP BY Customer_Segment ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Customer_Segment AS name, AVG(Customer_Lifetime_Value) AS value FROM customer_demographics ${where} GROUP BY Customer_Segment ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Customer_Status AS name, COUNT(*) AS value FROM customer_demographics ${where} GROUP BY Customer_Status ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Country AS name, COUNT(*) AS value FROM customer_demographics ${where} GROUP BY Country ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Acquisition_Source AS name, COUNT(*) AS value FROM customer_demographics ${where} GROUP BY Acquisition_Source ORDER BY value DESC`,
      params,
    ),
    query<{ score: number; value: number }>(
      `SELECT Net_Promoter_Score AS score, COUNT(*) AS value FROM customer_demographics ${where} GROUP BY score ORDER BY score`,
      params,
    ),
  ]);

  const total = totals?.total ?? 0;
  const avgChurn = round(totals?.avg_churn ?? 0, 1);
  const topSegmentByClv = [...segmentClvRaw].sort((a, b) => b.value - a.value)[0];
  const topCountry = countryRaw[0];
  const highChurnClause = where ? `${where} AND Churn_Risk_Score >= 70` : "WHERE Churn_Risk_Score >= 70";
  const highChurnShareQuery = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM customer_demographics ${highChurnClause}`,
    params,
  );
  const highChurnCount = highChurnShareQuery?.n ?? 0;

  const insights: CustomerData["insights"] = [];
  if (total > 0) {
    const pct = (highChurnCount / total) * 100;
    insights.push({
      id: "churn",
      text: `${pct.toFixed(1)}% of matched customers (${highChurnCount.toLocaleString()}) carry a churn risk score of 70 or higher.`,
      sentiment: pct > 25 ? "warning" : "neutral",
    });
  }
  if (topSegmentByClv) {
    insights.push({
      id: "segment-clv",
      text: `${topSegmentByClv.name} customers have the highest average lifetime value at ${formatUsd(topSegmentByClv.value)}.`,
      sentiment: "positive",
    });
  }
  if (topCountry) {
    const pct = total > 0 ? (topCountry.value / total) * 100 : 0;
    insights.push({
      id: "country",
      text: `${topCountry.name} accounts for the largest share of matched customers at ${pct.toFixed(1)}%.`,
      sentiment: "neutral",
    });
  }

  return {
    kpis: {
      totalCustomers: total,
      activeCustomers: totals?.active ?? 0,
      avgClv: round(totals?.avg_clv ?? 0),
      avgTotalSpent: round(totals?.avg_spent ?? 0),
      avgChurnRisk: avgChurn,
      avgNps: round(totals?.avg_nps ?? 0, 1),
    },
    segmentCounts: segmentCountRaw.map((r) => ({ name: r.name, value: r.value })),
    segmentAvgClv: segmentClvRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    statusBreakdown: statusRaw.map((r) => ({ name: r.name, value: r.value })),
    countryBreakdown: countryRaw.map((r) => ({ name: r.name, value: r.value })),
    acquisitionBreakdown: acquisitionRaw.map((r) => ({ name: r.name, value: r.value })),
    npsDistribution: npsRaw.map((r) => ({ name: String(r.score), value: r.value })),
    filterOptions: {
      segments: segments.map((s) => s.v),
      statuses: statuses.map((s) => s.v),
      countries: countries.map((s) => s.v),
      industries: industries.map((s) => s.v),
      acquisitionSources: acquisitionSources.map((s) => s.v),
    },
    insights,
  };
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export async function getCustomerRows(
  filters: CustomerFilters,
  page: number,
  pageSize: number,
  sortBy: string,
  sortDir: "asc" | "desc",
): Promise<CustomerTablePage> {
  const { where, params } = buildWhere(filters);
  const sortColumn = SORT_COLUMNS[sortBy] ?? "Customer_Lifetime_Value";
  const safeDir = sortDir === "asc" ? "ASC" : "DESC";
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(5, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const [totalRow, rows] = await Promise.all([
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM customer_demographics ${where}`, params),
    query<CustomerRow>(
      `SELECT Customer_ID AS customer_id, Customer_Segment AS segment, Customer_Status AS status, Country AS country,
              Industry AS industry, Age AS age, Total_Spent AS total_spent, Customer_Lifetime_Value AS clv,
              Churn_Risk_Score AS churn_risk_score, Net_Promoter_Score AS nps, Acquisition_Source AS acquisition_source
       FROM customer_demographics
       ${where}
       ORDER BY ${sortColumn} ${safeDir}
       LIMIT ? OFFSET ?`,
      [...params, safePageSize, offset],
    ),
  ]);

  return { rows, total: totalRow?.n ?? 0, page: safePage, pageSize: safePageSize };
}

export async function getCustomerProfile(customerId: string): Promise<CustomerProfile | undefined> {
  return queryOne<CustomerProfile>(
    `SELECT Customer_ID AS customer_id, Customer_Segment AS segment, Customer_Status AS status, Country AS country,
            Industry AS industry, Age AS age, Total_Spent AS total_spent, Customer_Lifetime_Value AS clv,
            Churn_Risk_Score AS churn_risk_score, Net_Promoter_Score AS nps, Acquisition_Source AS acquisition_source,
            Annual_Income AS annual_income, Number_of_Orders AS number_of_orders,
            Marketing_Emails_Opened AS marketing_emails_opened, Website_Sessions AS website_sessions,
            Mobile_App_User AS mobile_app_user, Newsletter_Subscriber AS newsletter_subscriber,
            Referral_Count AS referral_count
     FROM customer_demographics WHERE Customer_ID = ?`,
    [customerId],
  );
}
