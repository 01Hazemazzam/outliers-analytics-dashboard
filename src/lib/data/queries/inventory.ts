import { query, queryOne } from "../db";
import type { NamedValue } from "./executive";

export interface InventoryFilters {
  category?: string;
  supplier?: string;
  warehouse?: string;
  stockStatus?: string;
  search?: string;
}

export interface ProductRow {
  product_id: string;
  product_name: string;
  category: string;
  supplier: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  reorder_point: number;
  max_stock_level: number;
  stock_status: string;
  warehouse_location: string;
  inventory_value: number;
}

export interface InventoryKpis {
  totalProducts: number;
  totalStock: number;
  inventoryValue: number;
  potentialRevenue: number;
  lowStockCount: number;
  outOfStockCount: number;
  overstockedCount: number;
  discontinuedCount: number;
}

export interface InventoryFilterOptions {
  categories: string[];
  suppliers: string[];
  warehouses: string[];
  stockStatuses: string[];
}

export interface InventoryData {
  kpis: InventoryKpis;
  valueByCategory: NamedValue[];
  stockByWarehouse: NamedValue[];
  statusDistribution: NamedValue[];
  valueBySupplier: NamedValue[];
  unitsSoldYtdByCategory: NamedValue[];
  filterOptions: InventoryFilterOptions;
}

export interface InventoryTablePage {
  rows: ProductRow[];
  total: number;
  page: number;
  pageSize: number;
}

const SORT_COLUMNS: Record<string, string> = {
  product_id: "Product_ID",
  current_stock: "Current_Stock",
  cost_price: "Cost_Price",
  selling_price: "Selling_Price",
  inventory_value: "(Current_Stock * Cost_Price)",
};

function buildWhere(filters: InventoryFilters): { where: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.category) {
    clauses.push(`Category = ?`);
    params.push(filters.category);
  }
  if (filters.supplier) {
    clauses.push(`Supplier = ?`);
    params.push(filters.supplier);
  }
  if (filters.warehouse) {
    clauses.push(`Warehouse_Location = ?`);
    params.push(filters.warehouse);
  }
  if (filters.stockStatus) {
    clauses.push(`Stock_Status = ?`);
    params.push(filters.stockStatus);
  }
  if (filters.search) {
    clauses.push(`(Product_ID ILIKE ? OR Product_Name ILIKE ?)`);
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

export async function getInventoryData(filters: InventoryFilters): Promise<InventoryData> {
  const { where, params } = buildWhere(filters);

  const [totals, filterOptionsRaw] = await Promise.all([
    queryOne<{
      total: number;
      stock: number;
      value: number;
      potential: number;
      low_stock: number;
      out_of_stock: number;
      overstocked: number;
      discontinued: number;
    }>(
      `SELECT COUNT(*) AS total,
              SUM(Current_Stock) AS stock,
              SUM(Current_Stock * Cost_Price) AS value,
              SUM(Current_Stock * Selling_Price) AS potential,
              SUM(CASE WHEN Current_Stock > 0 AND Current_Stock <= Reorder_Point THEN 1 ELSE 0 END) AS low_stock,
              SUM(CASE WHEN Current_Stock = 0 THEN 1 ELSE 0 END) AS out_of_stock,
              SUM(CASE WHEN Current_Stock > Max_Stock_Level THEN 1 ELSE 0 END) AS overstocked,
              SUM(CASE WHEN Stock_Status = 'Discontinued' THEN 1 ELSE 0 END) AS discontinued
       FROM product_inventory ${where}`,
      params,
    ),
    Promise.all([
      query<{ v: string }>(`SELECT DISTINCT Category AS v FROM product_inventory ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Supplier AS v FROM product_inventory ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Warehouse_Location AS v FROM product_inventory ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Stock_Status AS v FROM product_inventory ORDER BY v`),
    ]),
  ]);

  const [categories, suppliers, warehouses, stockStatuses] = filterOptionsRaw;

  const [valueByCategoryRaw, stockByWarehouseRaw, statusRaw, valueBySupplierRaw, unitsSoldRaw] = await Promise.all([
    query<{ name: string; value: number }>(
      `SELECT Category AS name, SUM(Current_Stock * Cost_Price) AS value FROM product_inventory ${where} GROUP BY Category ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Warehouse_Location AS name, SUM(Current_Stock) AS value FROM product_inventory ${where} GROUP BY Warehouse_Location ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Stock_Status AS name, COUNT(*) AS value FROM product_inventory ${where} GROUP BY Stock_Status ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Supplier AS name, SUM(Current_Stock * Cost_Price) AS value FROM product_inventory ${where} GROUP BY Supplier ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Category AS name, SUM(Units_Sold_YTD) AS value FROM product_inventory ${where} GROUP BY Category ORDER BY value DESC`,
      params,
    ),
  ]);

  return {
    kpis: {
      totalProducts: totals?.total ?? 0,
      totalStock: totals?.stock ?? 0,
      inventoryValue: round(totals?.value ?? 0),
      potentialRevenue: round(totals?.potential ?? 0),
      lowStockCount: totals?.low_stock ?? 0,
      outOfStockCount: totals?.out_of_stock ?? 0,
      overstockedCount: totals?.overstocked ?? 0,
      discontinuedCount: totals?.discontinued ?? 0,
    },
    valueByCategory: valueByCategoryRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    stockByWarehouse: stockByWarehouseRaw.map((r) => ({ name: r.name, value: r.value })),
    statusDistribution: statusRaw.map((r) => ({ name: r.name, value: r.value })),
    valueBySupplier: valueBySupplierRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    unitsSoldYtdByCategory: unitsSoldRaw.map((r) => ({ name: r.name, value: r.value })),
    filterOptions: {
      categories: categories.map((c) => c.v),
      suppliers: suppliers.map((c) => c.v),
      warehouses: warehouses.map((c) => c.v),
      stockStatuses: stockStatuses.map((c) => c.v),
    },
  };
}

export async function getProductRows(
  filters: InventoryFilters,
  page: number,
  pageSize: number,
  sortBy: string,
  sortDir: "asc" | "desc",
): Promise<InventoryTablePage> {
  const { where, params } = buildWhere(filters);
  const sortColumn = SORT_COLUMNS[sortBy] ?? "Current_Stock";
  const safeDir = sortDir === "asc" ? "ASC" : "DESC";
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(5, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const [totalRow, rows] = await Promise.all([
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM product_inventory ${where}`, params),
    query<ProductRow>(
      `SELECT Product_ID AS product_id, Product_Name AS product_name, Category AS category, Supplier AS supplier,
              Cost_Price AS cost_price, Selling_Price AS selling_price, Current_Stock AS current_stock,
              Reorder_Point AS reorder_point, Max_Stock_Level AS max_stock_level, Stock_Status AS stock_status,
              Warehouse_Location AS warehouse_location, (Current_Stock * Cost_Price) AS inventory_value
       FROM product_inventory
       ${where}
       ORDER BY ${sortColumn} ${safeDir}
       LIMIT ? OFFSET ?`,
      [...params, safePageSize, offset],
    ),
  ]);

  return { rows, total: totalRow?.n ?? 0, page: safePage, pageSize: safePageSize };
}
