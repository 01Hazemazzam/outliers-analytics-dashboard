import path from "path";

export type DatasetKey =
  | "sales"
  | "customers"
  | "marketing"
  | "inventory"
  | "banking"
  | "hr";

export interface DatasetConfig {
  key: DatasetKey;
  label: string;
  table: string;
  filename: string;
  /** DuckDB dateformat string for this file's date columns, or null to let auto-detect handle ISO dates. */
  dateFormat: string | null;
  primaryKey: string;
  /** True when the source data is known to have some nulls in the primary key (a documented data-quality issue, not an ingestion bug). */
  primaryKeyNullable: boolean;
  /** Columns known to have zero variance across every row in the current data snapshot (placeholder/report-date fields). Surfaced as a quality note, excluded from analytical use. */
  degenerateColumns: string[];
  /** Columns that must never be negative. */
  nonNegativeColumns: string[];
}

// DATA_DIR is resolved from an env var / cwd at request time so a future
// "point at a different data directory" flow doesn't need a code change.
// The turbopackIgnore hint stops Turbopack from tracing the whole project
// as a dependency of this dynamic path.
export const DATA_DIR = path.resolve(/* turbopackIgnore: true */ process.env.DASHBOARD_DATA_DIR ?? process.cwd());

export const DATASETS: DatasetConfig[] = [
  {
    key: "sales",
    label: "Sales & E-commerce",
    table: "sales_ecommerce",
    filename: "sales_ecommerce_data.csv",
    dateFormat: "%Y-%m-%d",
    primaryKey: "Order_ID",
    primaryKeyNullable: false,
    degenerateColumns: [],
    nonNegativeColumns: ["Quantity", "Unit_Price", "Total_Amount", "Discount", "Final_Amount"],
  },
  {
    key: "customers",
    label: "Customers",
    table: "customer_demographics",
    filename: "customer_demographics_data.csv",
    dateFormat: null,
    primaryKey: "Customer_ID",
    primaryKeyNullable: false,
    degenerateColumns: [],
    nonNegativeColumns: ["Annual_Income", "Total_Spent", "Number_of_Orders", "Customer_Lifetime_Value"],
  },
  {
    key: "marketing",
    label: "Marketing",
    table: "marketing_campaigns",
    filename: "marketing_campaigns_data.csv",
    dateFormat: "%Y-%m-%d",
    primaryKey: "Campaign_ID",
    primaryKeyNullable: false,
    degenerateColumns: ["End_Date"],
    nonNegativeColumns: ["Budget", "Spent", "Impressions", "Clicks", "Conversions", "Revenue_Generated"],
  },
  {
    key: "inventory",
    label: "Inventory",
    table: "product_inventory",
    filename: "product_inventory_data.csv",
    dateFormat: "%Y-%m-%d",
    primaryKey: "Product_ID",
    primaryKeyNullable: false,
    degenerateColumns: ["Weight_kg", "Rating", "Last_Restocked"],
    nonNegativeColumns: ["Cost_Price", "Selling_Price", "Current_Stock", "Reorder_Point", "Max_Stock_Level"],
  },
  {
    key: "banking",
    label: "Banking & Financial",
    table: "banking_financial",
    filename: "banking_financial_data.csv",
    dateFormat: "%m/%d/%Y",
    primaryKey: "Transaction_ID",
    primaryKeyNullable: true,
    degenerateColumns: [],
    nonNegativeColumns: ["Amount", "Account_Balance_After", "Monthly_Income"],
  },
  {
    key: "hr",
    label: "HR / Employees",
    table: "employee_hr",
    filename: "employee_hr_data.csv",
    dateFormat: "%Y-%m-%d",
    primaryKey: "Employee_ID",
    primaryKeyNullable: false,
    degenerateColumns: [],
    nonNegativeColumns: ["Salary", "Years_Employed", "Training_Hours", "Sick_Days_Used", "Vacation_Days_Used"],
  },
];

export function datasetFilePath(dataset: DatasetConfig): string {
  return path.join(/* turbopackIgnore: true */ DATA_DIR, dataset.filename);
}
