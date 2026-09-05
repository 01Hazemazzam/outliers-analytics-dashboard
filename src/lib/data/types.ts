import type { DatasetKey } from "./config";

export type QualitySeverity = "error" | "warning" | "info";

export interface QualityIssue {
  dataset: DatasetKey;
  severity: QualitySeverity;
  message: string;
}

export interface DatasetIngestionResult {
  key: DatasetKey;
  label: string;
  rowCount: number;
  columnCount: number;
  loadedAt: string;
  fileMTimeMs: number;
  fileSizeBytes: number;
}

export interface DataQualityReport {
  generatedAt: string;
  totalDatasets: number;
  totalRows: number;
  issues: QualityIssue[];
  hasCriticalErrors: boolean;
}

export interface RefreshResult {
  changed: boolean;
  changedDatasets: DatasetKey[];
  lastUpdated: string;
  datasets: DatasetIngestionResult[];
  quality: DataQualityReport;
}
