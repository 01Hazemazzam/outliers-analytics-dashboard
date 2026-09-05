import { DuckDBInstance, DuckDBConnection } from "@duckdb/node-api";

// Next.js dev mode hot-reloads route modules; caching the connection on
// globalThis keeps us from spinning up a new in-memory DuckDB instance
// (and re-ingesting nothing into it) on every hot reload.
declare global {
  var __dashboardDuckDb__: Promise<DuckDBConnection> | undefined;
}

async function createConnection(): Promise<DuckDBConnection> {
  const instance = await DuckDBInstance.create(":memory:");
  return instance.connect();
}

export function getConnection(): Promise<DuckDBConnection> {
  if (!globalThis.__dashboardDuckDb__) {
    globalThis.__dashboardDuckDb__ = createConnection();
  }
  return globalThis.__dashboardDuckDb__;
}

type BindParam = string | number;

function bindParams(
  stmt: Awaited<ReturnType<DuckDBConnection["prepare"]>>,
  params: BindParam[],
) {
  params.forEach((value, index) => {
    if (typeof value === "number") {
      stmt.bindDouble(index + 1, value);
    } else {
      stmt.bindVarchar(index + 1, value);
    }
  });
}

function toJsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object" && "days" in (value as Record<string, unknown>)) {
    // DuckDB DATE values with no explicit strftime() cast surface as {days: N}.
    // Prefer formatting dates in SQL (strftime) so this branch is rarely hit;
    // this is a safety net, not the primary path.
    return value;
  }
  return value;
}

export async function run(sql: string, params: BindParam[] = []): Promise<void> {
  const conn = await getConnection();
  if (params.length) {
    const stmt = await conn.prepare(sql);
    bindParams(stmt, params);
    await stmt.run();
  } else {
    await conn.run(sql);
  }
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: BindParam[] = [],
): Promise<T[]> {
  const conn = await getConnection();
  const reader = params.length
    ? await (async () => {
        const stmt = await conn.prepare(sql);
        bindParams(stmt, params);
        return stmt.runAndReadAll();
      })()
    : await conn.runAndReadAll(sql);
  const rows = reader.getRowObjects();
  return JSON.parse(JSON.stringify(rows, (_key, value) => toJsonSafe(value))) as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: BindParam[] = [],
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}
