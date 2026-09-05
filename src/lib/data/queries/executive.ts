import { queryOne, query } from "../db";

export interface ExecutiveKpis {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalCustomers: number;
  activeCustomers: number;
  totalMarketingSpend: number;
  marketingRevenue: number;
  marketingRoas: number;
  totalInventoryValue: number;
  lowStockProducts: number;
  totalProducts: number;
  totalEmployees: number;
  fraudRate: number;
  avgChurnRisk: number;
  highChurnCustomers: number;
}

export interface TrendPoint {
  month: string;
  revenue: number;
  orders: number;
}

export interface NamedValue {
  name: string;
  value: number;
}

export interface PlatformPerformance {
  platform: string;
  spend: number;
  revenue: number;
  roas: number;
}

export interface Insight {
  id: string;
  text: string;
  sentiment: "positive" | "negative" | "neutral" | "warning";
}

export interface ExecutiveOverviewData {
  kpis: ExecutiveKpis;
  revenueTrend: TrendPoint[];
  revenueByCategory: NamedValue[];
  revenueByRegion: NamedValue[];
  customerSegments: NamedValue[];
  marketingByPlatform: PlatformPerformance[];
  inventoryByStockStatus: NamedValue[];
  fraudBreakdown: NamedValue[];
  headcountByDepartment: NamedValue[];
  insights: Insight[];
}

function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-");
  const date = new Date(Number(year), Number(monthNum) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function round(value: number | null | undefined, decimals = 2): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export async function getExecutiveOverview(): Promise<ExecutiveOverviewData> {
  const [salesTotals, customerTotals, marketingTotals, inventoryTotals, bankingTotals, hrTotals] =
    await Promise.all([
      queryOne<{ revenue: number; orders: number }>(
        `SELECT SUM(Final_Amount) AS revenue, COUNT(DISTINCT Order_ID) AS orders FROM sales_ecommerce`,
      ),
      queryOne<{ total: number; active: number; high_churn: number; avg_churn: number }>(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN Customer_Status = 'Active' THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN Churn_Risk_Score >= 70 THEN 1 ELSE 0 END) AS high_churn,
                AVG(Churn_Risk_Score) AS avg_churn
         FROM customer_demographics`,
      ),
      queryOne<{ spend: number; revenue: number }>(
        `SELECT SUM(Spent) AS spend, SUM(Revenue_Generated) AS revenue FROM marketing_campaigns`,
      ),
      queryOne<{ value: number; low_stock: number; total: number }>(
        `SELECT SUM(Current_Stock * Cost_Price) AS value,
                SUM(CASE WHEN Current_Stock <= Reorder_Point THEN 1 ELSE 0 END) AS low_stock,
                COUNT(*) AS total
         FROM product_inventory`,
      ),
      queryOne<{ total: number; fraud: number }>(
        `SELECT COUNT(*) AS total, SUM(CASE WHEN Is_Fraud THEN 1 ELSE 0 END) AS fraud FROM banking_financial`,
      ),
      queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM employee_hr`),
    ]);

  const totalRevenue = salesTotals?.revenue ?? 0;
  const totalOrders = salesTotals?.orders ?? 0;
  const totalMarketingSpend = marketingTotals?.spend ?? 0;
  const marketingRevenue = marketingTotals?.revenue ?? 0;
  const fraudTotal = bankingTotals?.total ?? 0;
  const fraudCount = bankingTotals?.fraud ?? 0;

  const kpis: ExecutiveKpis = {
    totalRevenue: round(totalRevenue),
    totalOrders,
    avgOrderValue: round(totalOrders > 0 ? totalRevenue / totalOrders : 0),
    totalCustomers: customerTotals?.total ?? 0,
    activeCustomers: customerTotals?.active ?? 0,
    totalMarketingSpend: round(totalMarketingSpend),
    marketingRevenue: round(marketingRevenue),
    marketingRoas: round(totalMarketingSpend > 0 ? marketingRevenue / totalMarketingSpend : 0),
    totalInventoryValue: round(inventoryTotals?.value ?? 0),
    lowStockProducts: inventoryTotals?.low_stock ?? 0,
    totalProducts: inventoryTotals?.total ?? 0,
    totalEmployees: hrTotals?.total ?? 0,
    fraudRate: round(fraudTotal > 0 ? (fraudCount / fraudTotal) * 100 : 0, 2),
    avgChurnRisk: round(customerTotals?.avg_churn ?? 0, 1),
    highChurnCustomers: customerTotals?.high_churn ?? 0,
  };

  const [
    revenueTrendRaw,
    revenueByCategoryRaw,
    revenueByRegionRaw,
    customerSegmentsRaw,
    marketingByPlatformRaw,
    inventoryByStockStatusRaw,
    fraudBreakdownRaw,
    headcountByDepartmentRaw,
  ] = await Promise.all([
    query<{ month: string; revenue: number; orders: number }>(
      `SELECT strftime(Order_Date, '%Y-%m') AS month, SUM(Final_Amount) AS revenue, COUNT(DISTINCT Order_ID) AS orders
       FROM sales_ecommerce GROUP BY month ORDER BY month`,
    ),
    query<{ name: string; value: number }>(
      `SELECT Category AS name, SUM(Final_Amount) AS value FROM sales_ecommerce GROUP BY Category ORDER BY value DESC`,
    ),
    query<{ name: string; value: number }>(
      `SELECT Region AS name, SUM(Final_Amount) AS value FROM sales_ecommerce GROUP BY Region ORDER BY value DESC`,
    ),
    query<{ name: string; value: number }>(
      `SELECT Customer_Segment AS name, COUNT(*) AS value FROM customer_demographics GROUP BY Customer_Segment ORDER BY value DESC`,
    ),
    query<{ platform: string; spend: number; revenue: number }>(
      `SELECT Platform AS platform, SUM(Spent) AS spend, SUM(Revenue_Generated) AS revenue
       FROM marketing_campaigns GROUP BY Platform ORDER BY revenue DESC`,
    ),
    query<{ name: string; value: number }>(
      `SELECT Stock_Status AS name, COUNT(*) AS value FROM product_inventory GROUP BY Stock_Status ORDER BY value DESC`,
    ),
    query<{ name: string; value: number }>(
      `SELECT CASE WHEN Is_Fraud THEN 'Fraudulent' ELSE 'Normal' END AS name, COUNT(*) AS value
       FROM banking_financial GROUP BY Is_Fraud`,
    ),
    query<{ name: string; value: number }>(
      `SELECT Department AS name, COUNT(*) AS value FROM employee_hr GROUP BY Department ORDER BY value DESC`,
    ),
  ]);

  const revenueTrend: TrendPoint[] = revenueTrendRaw.map((r) => ({
    month: r.month,
    revenue: round(r.revenue),
    orders: r.orders,
  }));
  const revenueByCategory: NamedValue[] = revenueByCategoryRaw.map((r) => ({ name: r.name, value: round(r.value) }));
  const revenueByRegion: NamedValue[] = revenueByRegionRaw.map((r) => ({ name: r.name, value: round(r.value) }));
  const customerSegments: NamedValue[] = customerSegmentsRaw.map((r) => ({ name: r.name, value: r.value }));
  const marketingByPlatform: PlatformPerformance[] = marketingByPlatformRaw.map((r) => ({
    platform: r.platform,
    spend: round(r.spend),
    revenue: round(r.revenue),
    roas: round(r.spend > 0 ? r.revenue / r.spend : 0),
  }));
  const inventoryByStockStatus: NamedValue[] = inventoryByStockStatusRaw.map((r) => ({ name: r.name, value: r.value }));
  const fraudBreakdown: NamedValue[] = fraudBreakdownRaw.map((r) => ({ name: r.name, value: r.value }));
  const headcountByDepartment: NamedValue[] = headcountByDepartmentRaw.map((r) => ({ name: r.name, value: r.value }));

  const insights: Insight[] = [];

  if (revenueTrend.length >= 2) {
    const last = revenueTrend[revenueTrend.length - 1];
    const prev = revenueTrend[revenueTrend.length - 2];
    if (prev.revenue > 0) {
      const pctChange = ((last.revenue - prev.revenue) / prev.revenue) * 100;
      const lastLabel = formatMonthLabel(last.month);
      const prevLabel = formatMonthLabel(prev.month);
      insights.push({
        id: "revenue-trend",
        text: `Revenue in ${lastLabel} was ${pctChange >= 0 ? "up" : "down"} ${Math.abs(pctChange).toFixed(1)}% versus ${prevLabel} ($${last.revenue.toLocaleString()} vs $${prev.revenue.toLocaleString()}).`,
        sentiment: pctChange >= 0 ? "positive" : "negative",
      });
    }
  }

  if (revenueByCategory.length > 0 && totalRevenue > 0) {
    const top = revenueByCategory[0];
    const share = (top.value / totalRevenue) * 100;
    insights.push({
      id: "top-category",
      text: `${top.name} is the top-performing category, generating ${share.toFixed(1)}% of total sales revenue.`,
      sentiment: "neutral",
    });
  }

  if (kpis.totalProducts > 0) {
    const pct = (kpis.lowStockProducts / kpis.totalProducts) * 100;
    insights.push({
      id: "low-stock",
      text: `${pct.toFixed(1)}% of products (${kpis.lowStockProducts.toLocaleString()} of ${kpis.totalProducts.toLocaleString()}) are at or below their reorder point.`,
      sentiment: pct > 20 ? "warning" : "neutral",
    });
  }

  if (marketingByPlatform.length > 0) {
    const bestRoas = [...marketingByPlatform].sort((a, b) => b.roas - a.roas)[0];
    insights.push({
      id: "marketing-roas",
      text: `${bestRoas.platform} delivers the highest marketing ROAS at ${bestRoas.roas.toFixed(2)}x, against a blended average of ${kpis.marketingRoas.toFixed(2)}x across all platforms.`,
      sentiment: "positive",
    });
  }

  insights.push({
    id: "fraud-rate",
    text: `${kpis.fraudRate.toFixed(2)}% of banking transactions are flagged fraudulent (Is_Fraud = true) — ground truth from the source data, no assumptions applied.`,
    sentiment: kpis.fraudRate > 2 ? "warning" : "neutral",
  });

  if (kpis.totalCustomers > 0) {
    const pct = (kpis.highChurnCustomers / kpis.totalCustomers) * 100;
    insights.push({
      id: "churn-risk",
      text: `${pct.toFixed(1)}% of customers (${kpis.highChurnCustomers.toLocaleString()}) carry a churn risk score of 70 or higher.`,
      sentiment: pct > 25 ? "warning" : "neutral",
    });
  }

  return {
    kpis,
    revenueTrend,
    revenueByCategory,
    revenueByRegion,
    customerSegments,
    marketingByPlatform,
    inventoryByStockStatus,
    fraudBreakdown,
    headcountByDepartment,
    insights,
  };
}
