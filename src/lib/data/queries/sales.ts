import { query, queryOne } from "../db";
import type { NamedValue } from "./executive";

export interface SalesFilters {
  category?: string;
  region?: string;
  channel?: string;
  paymentMethod?: string;
  gender?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface SalesOrderRow {
  order_id: string;
  customer_id: string;
  product_id: string;
  category: string;
  quantity: number;
  total_amount: number;
  discount: number;
  final_amount: number;
  order_date: string;
  sales_channel: string;
  payment_method: string;
  region: string;
  customer_satisfaction: number;
}

export interface SalesKpis {
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  avgOrderValue: number;
  totalDiscount: number;
  avgSatisfaction: number;
}

export interface SalesFilterOptions {
  categories: string[];
  regions: string[];
  channels: string[];
  paymentMethods: string[];
  genders: string[];
}

export interface SalesData {
  kpis: SalesKpis;
  revenueTrend: Array<{ month: string; revenue: number; orders: number }>;
  revenueByCategory: NamedValue[];
  revenueByRegion: NamedValue[];
  revenueByChannel: NamedValue[];
  revenueByPaymentMethod: NamedValue[];
  satisfactionDistribution: NamedValue[];
  genderSplit: NamedValue[];
  filterOptions: SalesFilterOptions;
}

export interface SalesTablePage {
  rows: SalesOrderRow[];
  total: number;
  page: number;
  pageSize: number;
}

const SORT_COLUMNS: Record<string, string> = {
  order_date: "Order_Date",
  final_amount: "Final_Amount",
  quantity: "Quantity",
  customer_satisfaction: "Customer_Satisfaction",
  order_id: "Order_ID",
};

function buildWhere(filters: SalesFilters): { where: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.category) {
    clauses.push(`Category = ?`);
    params.push(filters.category);
  }
  if (filters.region) {
    clauses.push(`Region = ?`);
    params.push(filters.region);
  }
  if (filters.channel) {
    clauses.push(`Sales_Channel = ?`);
    params.push(filters.channel);
  }
  if (filters.paymentMethod) {
    clauses.push(`Payment_Method = ?`);
    params.push(filters.paymentMethod);
  }
  if (filters.gender) {
    clauses.push(`Customer_Gender = ?`);
    params.push(filters.gender);
  }
  if (filters.dateFrom) {
    clauses.push(`Order_Date >= CAST(? AS DATE)`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    clauses.push(`Order_Date <= CAST(? AS DATE)`);
    params.push(filters.dateTo);
  }
  if (filters.search) {
    clauses.push(`(Order_ID ILIKE ? OR Customer_ID ILIKE ?)`);
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

export async function getSalesData(filters: SalesFilters): Promise<SalesData> {
  const { where, params } = buildWhere(filters);

  const [totals, filterOptions] = await Promise.all([
    queryOne<{ revenue: number; orders: number; units: number; discount: number; satisfaction: number }>(
      `SELECT SUM(Final_Amount) AS revenue, COUNT(DISTINCT Order_ID) AS orders, SUM(Quantity) AS units,
              SUM(Discount) AS discount, AVG(Customer_Satisfaction) AS satisfaction
       FROM sales_ecommerce ${where}`,
      params,
    ),
    Promise.all([
      query<{ v: string }>(`SELECT DISTINCT Category AS v FROM sales_ecommerce ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Region AS v FROM sales_ecommerce ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Sales_Channel AS v FROM sales_ecommerce ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Payment_Method AS v FROM sales_ecommerce ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Customer_Gender AS v FROM sales_ecommerce ORDER BY v`),
    ]),
  ]);

  const [categories, regions, channels, paymentMethods, genders] = filterOptions;

  const [revenueTrendRaw, categoryRaw, regionRaw, channelRaw, paymentRaw, satisfactionRaw, genderRaw] =
    await Promise.all([
      query<{ month: string; revenue: number; orders: number }>(
        `SELECT strftime(Order_Date, '%Y-%m') AS month, SUM(Final_Amount) AS revenue, COUNT(DISTINCT Order_ID) AS orders
         FROM sales_ecommerce ${where} GROUP BY month ORDER BY month`,
        params,
      ),
      query<{ name: string; value: number }>(
        `SELECT Category AS name, SUM(Final_Amount) AS value FROM sales_ecommerce ${where} GROUP BY Category ORDER BY value DESC`,
        params,
      ),
      query<{ name: string; value: number }>(
        `SELECT Region AS name, SUM(Final_Amount) AS value FROM sales_ecommerce ${where} GROUP BY Region ORDER BY value DESC`,
        params,
      ),
      query<{ name: string; value: number }>(
        `SELECT Sales_Channel AS name, SUM(Final_Amount) AS value FROM sales_ecommerce ${where} GROUP BY Sales_Channel ORDER BY value DESC`,
        params,
      ),
      query<{ name: string; value: number }>(
        `SELECT Payment_Method AS name, SUM(Final_Amount) AS value FROM sales_ecommerce ${where} GROUP BY Payment_Method ORDER BY value DESC`,
        params,
      ),
      query<{ stars: number; value: number }>(
        `SELECT CAST(ROUND(Customer_Satisfaction) AS INTEGER) AS stars, COUNT(*) AS value
         FROM sales_ecommerce ${where} GROUP BY stars ORDER BY stars`,
        params,
      ),
      query<{ name: string; value: number }>(
        `SELECT Customer_Gender AS name, COUNT(*) AS value FROM sales_ecommerce ${where} GROUP BY Customer_Gender ORDER BY value DESC`,
        params,
      ),
    ]);

  const totalRevenue = totals?.revenue ?? 0;
  const totalOrders = totals?.orders ?? 0;

  return {
    kpis: {
      totalRevenue: round(totalRevenue),
      totalOrders,
      totalUnits: totals?.units ?? 0,
      avgOrderValue: round(totalOrders > 0 ? totalRevenue / totalOrders : 0),
      totalDiscount: round(totals?.discount ?? 0),
      avgSatisfaction: round(totals?.satisfaction ?? 0, 2),
    },
    revenueTrend: revenueTrendRaw.map((r) => ({ month: r.month, revenue: round(r.revenue), orders: r.orders })),
    revenueByCategory: categoryRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    revenueByRegion: regionRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    revenueByChannel: channelRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    revenueByPaymentMethod: paymentRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    satisfactionDistribution: satisfactionRaw.map((r) => ({ name: `${r.stars}★`, value: r.value })),
    genderSplit: genderRaw.map((r) => ({ name: r.name, value: r.value })),
    filterOptions: {
      categories: categories.map((c) => c.v),
      regions: regions.map((c) => c.v),
      channels: channels.map((c) => c.v),
      paymentMethods: paymentMethods.map((c) => c.v),
      genders: genders.map((c) => c.v),
    },
  };
}

export async function getSalesOrders(
  filters: SalesFilters,
  page: number,
  pageSize: number,
  sortBy: string,
  sortDir: "asc" | "desc",
): Promise<SalesTablePage> {
  const { where, params } = buildWhere(filters);
  const sortColumn = SORT_COLUMNS[sortBy] ?? "Order_Date";
  const safeDir = sortDir === "asc" ? "ASC" : "DESC";
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(5, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const [totalRow, rows] = await Promise.all([
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM sales_ecommerce ${where}`, params),
    query<SalesOrderRow>(
      `SELECT Order_ID AS order_id, Customer_ID AS customer_id, Product_ID AS product_id, Category AS category,
              Quantity AS quantity, Total_Amount AS total_amount, Discount AS discount, Final_Amount AS final_amount,
              strftime(Order_Date, '%Y-%m-%d') AS order_date, Sales_Channel AS sales_channel,
              Payment_Method AS payment_method, Region AS region, Customer_Satisfaction AS customer_satisfaction
       FROM sales_ecommerce
       ${where}
       ORDER BY ${sortColumn} ${safeDir}
       LIMIT ? OFFSET ?`,
      [...params, safePageSize, offset],
    ),
  ]);

  return {
    rows,
    total: totalRow?.n ?? 0,
    page: safePage,
    pageSize: safePageSize,
  };
}
