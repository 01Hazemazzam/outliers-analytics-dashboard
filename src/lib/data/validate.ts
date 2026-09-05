import type { DatasetConfig } from "./config";
import { query, queryOne } from "./db";
import type { QualityIssue } from "./types";

async function tableColumns(table: string): Promise<string[]> {
  const rows = await query<{ column_name: string }>(`DESCRIBE ${table}`);
  return rows.map((r) => r.column_name);
}

async function nullCounts(table: string, columns: string[]): Promise<Record<string, number>> {
  const selects = columns.map((c) => `COUNT(*) - COUNT("${c}") AS "${c}"`).join(", ");
  const row = await queryOne<Record<string, number>>(`SELECT ${selects} FROM ${table}`);
  return row ?? {};
}

export async function validateDataset(dataset: DatasetConfig): Promise<QualityIssue[]> {
  const { table, key, primaryKey, primaryKeyNullable, degenerateColumns, nonNegativeColumns } = dataset;
  const issues: QualityIssue[] = [];

  const totalRow = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
  const totalRows = totalRow?.n ?? 0;

  // Primary key: nulls
  const pkNullRow = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ${table} WHERE "${primaryKey}" IS NULL`,
  );
  const pkNulls = pkNullRow?.n ?? 0;
  if (pkNulls > 0) {
    const pct = ((pkNulls / totalRows) * 100).toFixed(2);
    issues.push({
      dataset: key,
      severity: primaryKeyNullable ? "warning" : "error",
      message: `${primaryKey} is missing on ${pkNulls} of ${totalRows} rows (${pct}%)${
        primaryKeyNullable ? " — a known gap in this dataset; affected rows are excluded from primary-key-based counts" : ""
      }.`,
    });
  }

  // Primary key: duplicates among non-null values
  const pkDupRow = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM (
       SELECT "${primaryKey}" FROM ${table} WHERE "${primaryKey}" IS NOT NULL
       GROUP BY "${primaryKey}" HAVING COUNT(*) > 1
     )`,
  );
  const pkDups = pkDupRow?.n ?? 0;
  if (pkDups > 0) {
    issues.push({
      dataset: key,
      severity: "error",
      message: `${primaryKey} has ${pkDups} duplicated value(s) — expected a unique key.`,
    });
  }

  // Fully duplicate rows
  const distinctRow = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM (SELECT DISTINCT * FROM ${table})`);
  const duplicateRows = totalRows - (distinctRow?.n ?? totalRows);
  if (duplicateRows > 0) {
    issues.push({
      dataset: key,
      severity: "warning",
      message: `${duplicateRows} fully duplicate row(s) found.`,
    });
  }

  // Non-negative columns
  for (const col of nonNegativeColumns) {
    const badRow = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table} WHERE "${col}" < 0`);
    const bad = badRow?.n ?? 0;
    if (bad > 0) {
      issues.push({
        dataset: key,
        severity: "error",
        message: `${col} is negative on ${bad} row(s), which should never happen.`,
      });
    }
  }

  // Declared degenerate (zero-variance) columns — confirm and report the constant value.
  for (const col of degenerateColumns) {
    const row = await queryOne<{ distinct_n: number; sample: unknown }>(
      `SELECT COUNT(DISTINCT "${col}") AS distinct_n, CAST(MIN("${col}") AS VARCHAR) AS sample FROM ${table}`,
    );
    if (row && Number(row.distinct_n) <= 1) {
      issues.push({
        dataset: key,
        severity: "info",
        message: `${col} is constant (${String(row.sample)}) across every row — treated as a snapshot/placeholder field, excluded from charts.`,
      });
    }
  }

  // Other columns with unexpected nulls (not the primary key, not already known-nullable in config)
  const allColumns = await tableColumns(table);
  const columnsToScan = allColumns.filter((c) => c !== primaryKey);
  if (columnsToScan.length) {
    const nulls = await nullCounts(table, columnsToScan);
    for (const [col, n] of Object.entries(nulls)) {
      if (n > 0) {
        const pct = (n / totalRows) * 100;
        issues.push({
          dataset: key,
          severity: pct > 50 ? "info" : "warning",
          message: `${col} is missing on ${n} row(s) (${pct.toFixed(2)}%).`,
        });
      }
    }
  }

  // HR-specific: duplicate email addresses (contact identifier, not a table key)
  if (key === "hr") {
    const dupEmailRow = await queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM (
         SELECT Email FROM ${table} GROUP BY Email HAVING COUNT(*) > 1
       )`,
    );
    const dupEmails = dupEmailRow?.n ?? 0;
    if (dupEmails > 0) {
      issues.push({
        dataset: key,
        severity: "warning",
        message: `${dupEmails} email address(es) are reused across multiple employee records.`,
      });
    }
  }

  // Marketing-specific: campaigns that spent beyond their budget
  if (key === "marketing") {
    const overspendRow = await queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${table} WHERE Spent > Budget`,
    );
    const overspend = overspendRow?.n ?? 0;
    if (overspend > 0) {
      const pct = ((overspend / totalRows) * 100).toFixed(1);
      issues.push({
        dataset: key,
        severity: "info",
        message: `${overspend} campaign(s) (${pct}%) spent more than their allocated budget — shown as-is, not capped.`,
      });
    }
  }

  return issues;
}
