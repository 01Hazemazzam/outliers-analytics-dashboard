import fs from "fs/promises";
import { DATASETS, type DatasetConfig, type DatasetKey, datasetFilePath } from "./config";
import { run, query, queryOne } from "./db";
import { validateDataset } from "./validate";
import type { DatasetIngestionResult, QualityIssue, RefreshResult } from "./types";

interface FileStamp {
  mtimeMs: number;
  size: number;
}

declare global {
  var __dashboardFileStamps__: Map<DatasetKey, FileStamp> | undefined;
  var __dashboardDatasetMeta__: Map<DatasetKey, DatasetIngestionResult> | undefined;
  var __dashboardLastUpdated__: string | undefined;
  var __dashboardRefreshInFlight__: Promise<RefreshResult> | null | undefined;
}

function stampsMap(): Map<DatasetKey, FileStamp> {
  if (!globalThis.__dashboardFileStamps__) globalThis.__dashboardFileStamps__ = new Map();
  return globalThis.__dashboardFileStamps__;
}

function metaMap(): Map<DatasetKey, DatasetIngestionResult> {
  if (!globalThis.__dashboardDatasetMeta__) globalThis.__dashboardDatasetMeta__ = new Map();
  return globalThis.__dashboardDatasetMeta__;
}

async function ingestDataset(dataset: DatasetConfig, stat: { mtimeMs: number; size: number }) {
  const filePath = datasetFilePath(dataset);
  const dateFormatClause = dataset.dateFormat ? `, dateformat = '${dataset.dateFormat}'` : "";
  const sql = `CREATE OR REPLACE TABLE ${dataset.table} AS SELECT * FROM read_csv(?, header = true, auto_detect = true, sample_size = -1${dateFormatClause})`;
  await run(sql, [filePath]);

  const countRow = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM ${dataset.table}`);
  const colRows = await query<{ column_name: string }>(`DESCRIBE ${dataset.table}`);

  const result: DatasetIngestionResult = {
    key: dataset.key,
    label: dataset.label,
    rowCount: countRow?.n ?? 0,
    columnCount: colRows.length,
    loadedAt: new Date().toISOString(),
    fileMTimeMs: stat.mtimeMs,
    fileSizeBytes: stat.size,
  };
  metaMap().set(dataset.key, result);
  stampsMap().set(dataset.key, { mtimeMs: stat.mtimeMs, size: stat.size });
}

async function doRefresh(opts: { force?: boolean }): Promise<RefreshResult> {
  const changedDatasets: DatasetKey[] = [];
  const missing: DatasetConfig[] = [];
  const stamps = stampsMap();

  for (const dataset of DATASETS) {
    const filePath = datasetFilePath(dataset);
    let stat: { mtimeMs: number; size: number };
    try {
      const s = await fs.stat(filePath);
      stat = { mtimeMs: s.mtimeMs, size: s.size };
    } catch {
      missing.push(dataset);
      continue;
    }

    const prev = stamps.get(dataset.key);
    const isNew = !prev;
    const isChanged = !!prev && (prev.mtimeMs !== stat.mtimeMs || prev.size !== stat.size);

    if (opts.force || isNew || isChanged) {
      await ingestDataset(dataset, stat);
      changedDatasets.push(dataset.key);
    }
  }

  const issues: QualityIssue[] = [];
  for (const dataset of DATASETS) {
    if (missing.some((m) => m.key === dataset.key)) {
      issues.push({
        dataset: dataset.key,
        severity: "error",
        message: `Source file "${dataset.filename}" could not be found or read at ${datasetFilePath(dataset)}.`,
      });
      continue;
    }
    issues.push(...(await validateDataset(dataset)));
  }

  const datasetResults = DATASETS.map((d) => metaMap().get(d.key)).filter(
    (d): d is DatasetIngestionResult => !!d,
  );
  const totalRows = datasetResults.reduce((sum, d) => sum + d.rowCount, 0);
  const hasCriticalErrors = issues.some((i) => i.severity === "error");

  if (changedDatasets.length > 0 || !globalThis.__dashboardLastUpdated__) {
    globalThis.__dashboardLastUpdated__ = new Date().toISOString();
  }

  return {
    changed: changedDatasets.length > 0,
    changedDatasets,
    lastUpdated: globalThis.__dashboardLastUpdated__!,
    datasets: datasetResults,
    quality: {
      generatedAt: new Date().toISOString(),
      totalDatasets: datasetResults.length,
      totalRows,
      issues,
      hasCriticalErrors,
    },
  };
}

/**
 * Checks every source file's mtime/size against the last-ingested snapshot and
 * re-ingests only the datasets that changed (or all of them on first run, or
 * when force is set). Concurrent calls collapse onto a single in-flight run so
 * a poll tick and a manual "Refresh Data" click never double-ingest.
 */
export function refreshData(opts: { force?: boolean } = {}): Promise<RefreshResult> {
  if (globalThis.__dashboardRefreshInFlight__) {
    return globalThis.__dashboardRefreshInFlight__;
  }
  const p = doRefresh(opts).finally(() => {
    globalThis.__dashboardRefreshInFlight__ = null;
  });
  globalThis.__dashboardRefreshInFlight__ = p;
  return p;
}

export function ensureDataLoaded(): Promise<RefreshResult> {
  return refreshData({});
}
