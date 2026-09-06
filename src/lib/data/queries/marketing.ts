import { query, queryOne } from "../db";
import type { NamedValue } from "./executive";

export interface MarketingFilters {
  platform?: string;
  campaignType?: string;
  industry?: string;
  objective?: string;
  search?: string;
}

export interface CampaignRow {
  campaign_id: string;
  campaign_name: string;
  platform: string;
  campaign_type: string;
  industry: string;
  objective: string;
  budget: number;
  spent: number;
  revenue_generated: number;
  roas: number;
  cpa: number;
  conversions: number;
  conversion_rate_percent: number;
}

export interface MarketingKpis {
  totalBudget: number;
  totalSpent: number;
  totalRevenue: number;
  blendedRoas: number;
  totalConversions: number;
  totalLeads: number;
}

export interface MarketingFilterOptions {
  platforms: string[];
  campaignTypes: string[];
  industries: string[];
  objectives: string[];
}

export interface MarketingData {
  kpis: MarketingKpis;
  trend: Array<{ month: string; primary: number; secondary: number }>;
  revenueByPlatform: NamedValue[];
  roasByPlatform: Array<{ platform: string; spend: number; revenue: number; roas: number }>;
  cpaByType: NamedValue[];
  conversionRateByPlatform: NamedValue[];
  revenueByIndustry: NamedValue[];
  filterOptions: MarketingFilterOptions;
}

export interface MarketingTablePage {
  rows: CampaignRow[];
  total: number;
  page: number;
  pageSize: number;
}

const SORT_COLUMNS: Record<string, string> = {
  campaign_id: "Campaign_ID",
  budget: "Budget",
  spent: "Spent",
  revenue_generated: "Revenue_Generated",
  roas: "ROAS",
  cpa: "CPA",
  conversions: "Conversions",
};

function buildWhere(filters: MarketingFilters): { where: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.platform) {
    clauses.push(`Platform = ?`);
    params.push(filters.platform);
  }
  if (filters.campaignType) {
    clauses.push(`Campaign_Type = ?`);
    params.push(filters.campaignType);
  }
  if (filters.industry) {
    clauses.push(`Industry = ?`);
    params.push(filters.industry);
  }
  if (filters.objective) {
    clauses.push(`Objective = ?`);
    params.push(filters.objective);
  }
  if (filters.search) {
    clauses.push(`(Campaign_ID ILIKE ? OR Campaign_Name ILIKE ?)`);
    const like = `%${filters.search}%`;
    params.push(like, like);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

function round(value: number | null | undefined, decimals = 2): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export async function getMarketingData(filters: MarketingFilters): Promise<MarketingData> {
  const { where, params } = buildWhere(filters);

  const [totals, filterOptionsRaw] = await Promise.all([
    queryOne<{ budget: number; spent: number; revenue: number; conversions: number; leads: number }>(
      `SELECT SUM(Budget) AS budget, SUM(Spent) AS spent, SUM(Revenue_Generated) AS revenue,
              SUM(Conversions) AS conversions, SUM(Leads_Generated) AS leads
       FROM marketing_campaigns ${where}`,
      params,
    ),
    Promise.all([
      query<{ v: string }>(`SELECT DISTINCT Platform AS v FROM marketing_campaigns ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Campaign_Type AS v FROM marketing_campaigns ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Industry AS v FROM marketing_campaigns ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Objective AS v FROM marketing_campaigns ORDER BY v`),
    ]),
  ]);

  const [platforms, campaignTypes, industries, objectives] = filterOptionsRaw;

  const [trendRaw, platformRevenueRaw, platformRoasRaw, cpaTypeRaw, conversionPlatformRaw, industryRaw] =
    await Promise.all([
      query<{ month: string; revenue: number; spent: number }>(
        `SELECT strftime(Start_Date, '%Y-%m') AS month, SUM(Revenue_Generated) AS revenue, SUM(Spent) AS spent
         FROM marketing_campaigns ${where} GROUP BY month ORDER BY month`,
        params,
      ),
      query<{ name: string; value: number }>(
        `SELECT Platform AS name, SUM(Revenue_Generated) AS value FROM marketing_campaigns ${where} GROUP BY Platform ORDER BY value DESC`,
        params,
      ),
      query<{ platform: string; spend: number; revenue: number }>(
        `SELECT Platform AS platform, SUM(Spent) AS spend, SUM(Revenue_Generated) AS revenue
         FROM marketing_campaigns ${where} GROUP BY Platform ORDER BY revenue DESC`,
        params,
      ),
      query<{ name: string; value: number }>(
        `SELECT Campaign_Type AS name, AVG(CPA) AS value FROM marketing_campaigns ${where} GROUP BY Campaign_Type ORDER BY value DESC`,
        params,
      ),
      query<{ name: string; value: number }>(
        `SELECT Platform AS name, AVG(Conversion_Rate_Percent) AS value FROM marketing_campaigns ${where} GROUP BY Platform ORDER BY value DESC`,
        params,
      ),
      query<{ name: string; value: number }>(
        `SELECT Industry AS name, SUM(Revenue_Generated) AS value FROM marketing_campaigns ${where} GROUP BY Industry ORDER BY value DESC`,
        params,
      ),
    ]);

  const totalSpent = totals?.spent ?? 0;
  const totalRevenue = totals?.revenue ?? 0;

  return {
    kpis: {
      totalBudget: round(totals?.budget ?? 0),
      totalSpent: round(totalSpent),
      totalRevenue: round(totalRevenue),
      blendedRoas: round(totalSpent > 0 ? totalRevenue / totalSpent : 0),
      totalConversions: totals?.conversions ?? 0,
      totalLeads: totals?.leads ?? 0,
    },
    trend: trendRaw.map((r) => ({ month: r.month, primary: round(r.revenue), secondary: round(r.spent) })),
    revenueByPlatform: platformRevenueRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    roasByPlatform: platformRoasRaw.map((r) => ({
      platform: r.platform,
      spend: round(r.spend),
      revenue: round(r.revenue),
      roas: round(r.spend > 0 ? r.revenue / r.spend : 0),
    })),
    cpaByType: cpaTypeRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    conversionRateByPlatform: conversionPlatformRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    revenueByIndustry: industryRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    filterOptions: {
      platforms: platforms.map((p) => p.v),
      campaignTypes: campaignTypes.map((p) => p.v),
      industries: industries.map((p) => p.v),
      objectives: objectives.map((p) => p.v),
    },
  };
}

export async function getCampaignRows(
  filters: MarketingFilters,
  page: number,
  pageSize: number,
  sortBy: string,
  sortDir: "asc" | "desc",
): Promise<MarketingTablePage> {
  const { where, params } = buildWhere(filters);
  const sortColumn = SORT_COLUMNS[sortBy] ?? "Revenue_Generated";
  const safeDir = sortDir === "asc" ? "ASC" : "DESC";
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(5, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const [totalRow, rows] = await Promise.all([
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM marketing_campaigns ${where}`, params),
    query<CampaignRow>(
      `SELECT Campaign_ID AS campaign_id, Campaign_Name AS campaign_name, Platform AS platform,
              Campaign_Type AS campaign_type, Industry AS industry, Objective AS objective,
              Budget AS budget, Spent AS spent, Revenue_Generated AS revenue_generated, ROAS AS roas,
              CPA AS cpa, Conversions AS conversions, Conversion_Rate_Percent AS conversion_rate_percent
       FROM marketing_campaigns
       ${where}
       ORDER BY ${sortColumn} ${safeDir}
       LIMIT ? OFFSET ?`,
      [...params, safePageSize, offset],
    ),
  ]);

  return { rows, total: totalRow?.n ?? 0, page: safePage, pageSize: safePageSize };
}
