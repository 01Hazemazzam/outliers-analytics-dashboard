import { query, queryOne } from "../db";
import { DATASETS, type DatasetConfig, type DatasetKey } from "../config";

export interface ColumnInfo {
  name: string;
  type: string;
}

export interface ExplorerSchema {
  key: DatasetKey;
  label: string;
  table: string;
  filename: string;
  rowCount: number;
  columns: ColumnInfo[];
}

export interface ExplorerFilters {
  search?: string;
  filterColumn?: string;
  filterValue?: string;
}

export interface ExplorerTablePage {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExplorerExportResult {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  truncated: boolean;
}

const EXPORT_ROW_LIMIT = 5000;

function getDataset(key: DatasetKey): DatasetConfig {
  const dataset = DATASETS.find((d) => d.key === key);
  if (!dataset) throw new Error(`Unknown dataset: ${key}`);
  return dataset;
}

/** Column names/types come from DuckDB's own DESCRIBE output, not the request — safe to interpolate into SQL after this. */
export async function getExplorerSchema(key: DatasetKey): Promise<ExplorerSchema> {
  const dataset = getDataset(key);
  const [columnsRaw, countRow] = await Promise.all([
    query<{ column_name: string; column_type: string }>(`DESCRIBE ${dataset.table}`),
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM ${dataset.table}`),
  ]);
  return {
    key: dataset.key,
    label: dataset.label,
    table: dataset.table,
    filename: dataset.filename,
    rowCount: countRow?.n ?? 0,
    columns: columnsRaw.map((c) => ({ name: c.column_name, type: c.column_type })),
  };
}

export async function getDistinctColumnValues(key: DatasetKey, column: string): Promise<string[]> {
  const dataset = getDataset(key);
  const schema = await getExplorerSchema(key);
  if (!schema.columns.some((c) => c.name === column)) return [];

  const rows = await query<{ v: string }>(
    `SELECT DISTINCT CAST("${column}" AS VARCHAR) AS v FROM ${dataset.table}
     WHERE "${column}" IS NOT NULL ORDER BY v LIMIT 200`,
  );
  return rows.map((r) => r.v);
}

function buildWhere(
  columnNames: string[],
  filters: ExplorerFilters,
): { where: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.search) {
    const like = `%${filters.search}%`;
    clauses.push(`(${columnNames.map((c) => `CAST("${c}" AS VARCHAR) ILIKE ?`).join(" OR ")})`);
    columnNames.forEach(() => params.push(like));
  }

  if (filters.filterColumn && filters.filterValue && columnNames.includes(filters.filterColumn)) {
    clauses.push(`CAST("${filters.filterColumn}" AS VARCHAR) = ?`);
    params.push(filters.filterValue);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

/** DATE/TIMESTAMP columns need strftime() to serialize as plain strings instead of DuckDB's {days:N} shape. */
function buildSelectList(columns: ColumnInfo[]): string {
  return columns
    .map((c) =>
      c.type === "DATE" || c.type.startsWith("TIMESTAMP")
        ? `strftime("${c.name}", '%Y-%m-%d') AS "${c.name}"`
        : `"${c.name}"`,
    )
    .join(", ");
}

export async function getExplorerRows(
  key: DatasetKey,
  filters: ExplorerFilters,
  page: number,
  pageSize: number,
  sortBy: string | undefined,
  sortDir: "asc" | "desc",
): Promise<ExplorerTablePage> {
  const dataset = getDataset(key);
  const schema = await getExplorerSchema(key);
  const columnNames = schema.columns.map((c) => c.name);

  const { where, params } = buildWhere(columnNames, filters);
  const sortColumn = sortBy && columnNames.includes(sortBy) ? sortBy : dataset.primaryKey;
  const safeDir = sortDir === "asc" ? "ASC" : "DESC";
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(5, pageSize));
  const offset = (safePage - 1) * safePageSize;
  const selectList = buildSelectList(schema.columns);

  const [totalRow, rows] = await Promise.all([
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM ${dataset.table} ${where}`, params),
    query<Record<string, unknown>>(
      `SELECT ${selectList} FROM ${dataset.table} ${where} ORDER BY "${sortColumn}" ${safeDir} LIMIT ? OFFSET ?`,
      [...params, safePageSize, offset],
    ),
  ]);

  return { columns: schema.columns, rows, total: totalRow?.n ?? 0, page: safePage, pageSize: safePageSize };
}

export async function getExplorerExportRows(
  key: DatasetKey,
  filters: ExplorerFilters,
  sortBy: string | undefined,
  sortDir: "asc" | "desc",
): Promise<ExplorerExportResult> {
  const dataset = getDataset(key);
  const schema = await getExplorerSchema(key);
  const columnNames = schema.columns.map((c) => c.name);

  const { where, params } = buildWhere(columnNames, filters);
  const sortColumn = sortBy && columnNames.includes(sortBy) ? sortBy : dataset.primaryKey;
  const safeDir = sortDir === "asc" ? "ASC" : "DESC";
  const selectList = buildSelectList(schema.columns);

  const rows = await query<Record<string, unknown>>(
    `SELECT ${selectList} FROM ${dataset.table} ${where} ORDER BY "${sortColumn}" ${safeDir} LIMIT ?`,
    [...params, EXPORT_ROW_LIMIT + 1],
  );

  const truncated = rows.length > EXPORT_ROW_LIMIT;
  return { columns: schema.columns, rows: truncated ? rows.slice(0, EXPORT_ROW_LIMIT) : rows, truncated };
}
