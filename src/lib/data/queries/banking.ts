import { query, queryOne } from "../db";
import type { NamedValue } from "./executive";

export interface BankingFilters {
  transactionType?: string;
  accountType?: string;
  channel?: string;
  city?: string;
  search?: string;
}

export interface TransactionRow {
  transaction_id: string;
  account_id: string;
  customer_id: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  account_balance_after: number;
  account_type: string;
  channel: string;
  city: string;
  credit_score: number;
  risk_score: number;
  is_fraud: boolean;
  previous_default: boolean;
}

export interface BankingKpis {
  totalTransactions: number;
  totalVolume: number;
  avgTransactionAmount: number;
  fraudRatePercent: number;
  avgRiskScore: number;
  avgCreditScore: number;
}

export interface BankingAlerts {
  fraudCount: number;
  highRiskCount: number;
  previousDefaultCount: number;
  poorCreditCount: number;
}

export interface BankingFilterOptions {
  transactionTypes: string[];
  accountTypes: string[];
  channels: string[];
  cities: string[];
}

export interface BankingData {
  kpis: BankingKpis;
  alerts: BankingAlerts;
  trend: Array<{ month: string; primary: number; secondary: number }>;
  volumeByTransactionType: NamedValue[];
  volumeByAccountType: NamedValue[];
  fraudRateByChannel: NamedValue[];
  avgRiskScoreByCity: NamedValue[];
  filterOptions: BankingFilterOptions;
}

export interface BankingTablePage {
  rows: TransactionRow[];
  total: number;
  page: number;
  pageSize: number;
}

const SORT_COLUMNS: Record<string, string> = {
  transaction_date: "Transaction_Date",
  amount: "Amount",
  risk_score: "Risk_Score",
  credit_score: "Credit_Score",
  transaction_id: "Transaction_ID",
};

function buildWhere(filters: BankingFilters): { where: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.transactionType) {
    clauses.push(`Transaction_Type = ?`);
    params.push(filters.transactionType);
  }
  if (filters.accountType) {
    clauses.push(`Account_Type = ?`);
    params.push(filters.accountType);
  }
  if (filters.channel) {
    clauses.push(`Channel = ?`);
    params.push(filters.channel);
  }
  if (filters.city) {
    clauses.push(`City = ?`);
    params.push(filters.city);
  }
  if (filters.search) {
    clauses.push(`(Transaction_ID ILIKE ? OR Account_ID ILIKE ? OR Customer_ID ILIKE ?)`);
    const like = `%${filters.search}%`;
    params.push(like, like, like);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

function round(value: number | null | undefined, decimals = 2): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export async function getBankingData(filters: BankingFilters): Promise<BankingData> {
  const { where, params } = buildWhere(filters);

  const [totals, filterOptionsRaw] = await Promise.all([
    queryOne<{
      total: number;
      volume: number;
      avg_amount: number;
      fraud: number;
      avg_risk: number;
      avg_credit: number;
      high_risk: number;
      previous_default: number;
      poor_credit: number;
    }>(
      `SELECT COUNT(*) AS total,
              SUM(Amount) AS volume,
              AVG(Amount) AS avg_amount,
              SUM(CASE WHEN Is_Fraud THEN 1 ELSE 0 END) AS fraud,
              AVG(Risk_Score) AS avg_risk,
              AVG(Credit_Score) AS avg_credit,
              SUM(CASE WHEN Risk_Score >= 70 THEN 1 ELSE 0 END) AS high_risk,
              SUM(CASE WHEN Previous_Default THEN 1 ELSE 0 END) AS previous_default,
              SUM(CASE WHEN Credit_Score < 580 THEN 1 ELSE 0 END) AS poor_credit
       FROM banking_financial ${where}`,
      params,
    ),
    Promise.all([
      query<{ v: string }>(`SELECT DISTINCT Transaction_Type AS v FROM banking_financial ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Account_Type AS v FROM banking_financial ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT Channel AS v FROM banking_financial ORDER BY v`),
      query<{ v: string }>(`SELECT DISTINCT City AS v FROM banking_financial ORDER BY v`),
    ]),
  ]);

  const [transactionTypes, accountTypes, channels, cities] = filterOptionsRaw;

  const [trendRaw, typeRaw, accountTypeRaw, channelFraudRaw, cityRiskRaw] = await Promise.all([
    query<{ month: string; volume: number; fraud: number }>(
      `SELECT strftime(Transaction_Date, '%Y-%m') AS month, SUM(Amount) AS volume,
              SUM(CASE WHEN Is_Fraud THEN 1 ELSE 0 END) AS fraud
       FROM banking_financial ${where} GROUP BY month ORDER BY month`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Transaction_Type AS name, SUM(Amount) AS value FROM banking_financial ${where} GROUP BY Transaction_Type ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Account_Type AS name, SUM(Amount) AS value FROM banking_financial ${where} GROUP BY Account_Type ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT Channel AS name, (SUM(CASE WHEN Is_Fraud THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) AS value
       FROM banking_financial ${where} GROUP BY Channel ORDER BY value DESC`,
      params,
    ),
    query<{ name: string; value: number }>(
      `SELECT City AS name, AVG(Risk_Score) AS value FROM banking_financial ${where} GROUP BY City ORDER BY value DESC`,
      params,
    ),
  ]);

  const total = totals?.total ?? 0;
  const fraud = totals?.fraud ?? 0;

  return {
    kpis: {
      totalTransactions: total,
      totalVolume: round(totals?.volume ?? 0),
      avgTransactionAmount: round(totals?.avg_amount ?? 0),
      fraudRatePercent: round(total > 0 ? (fraud / total) * 100 : 0),
      avgRiskScore: round(totals?.avg_risk ?? 0, 1),
      avgCreditScore: round(totals?.avg_credit ?? 0, 0),
    },
    alerts: {
      fraudCount: fraud,
      highRiskCount: totals?.high_risk ?? 0,
      previousDefaultCount: totals?.previous_default ?? 0,
      poorCreditCount: totals?.poor_credit ?? 0,
    },
    trend: trendRaw.map((r) => ({ month: r.month, primary: round(r.volume), secondary: r.fraud })),
    volumeByTransactionType: typeRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    volumeByAccountType: accountTypeRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    fraudRateByChannel: channelFraudRaw.map((r) => ({ name: r.name, value: round(r.value) })),
    avgRiskScoreByCity: cityRiskRaw.map((r) => ({ name: r.name, value: round(r.value, 1) })),
    filterOptions: {
      transactionTypes: transactionTypes.map((c) => c.v),
      accountTypes: accountTypes.map((c) => c.v),
      channels: channels.map((c) => c.v),
      cities: cities.map((c) => c.v),
    },
  };
}

export async function getTransactionRows(
  filters: BankingFilters,
  page: number,
  pageSize: number,
  sortBy: string,
  sortDir: "asc" | "desc",
): Promise<BankingTablePage> {
  const { where, params } = buildWhere(filters);
  const sortColumn = SORT_COLUMNS[sortBy] ?? "Transaction_Date";
  const safeDir = sortDir === "asc" ? "ASC" : "DESC";
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(5, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const [totalRow, rows] = await Promise.all([
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM banking_financial ${where}`, params),
    query<TransactionRow>(
      `SELECT Transaction_ID AS transaction_id, Account_ID AS account_id, Customer_ID AS customer_id,
              strftime(Transaction_Date, '%Y-%m-%d') AS transaction_date, Transaction_Type AS transaction_type,
              Amount AS amount, Account_Balance_After AS account_balance_after, Account_Type AS account_type,
              Channel AS channel, City AS city, Credit_Score AS credit_score, Risk_Score AS risk_score,
              Is_Fraud AS is_fraud, Previous_Default AS previous_default
       FROM banking_financial
       ${where}
       ORDER BY ${sortColumn} ${safeDir}
       LIMIT ? OFFSET ?`,
      [...params, safePageSize, offset],
    ),
  ]);

  return { rows, total: totalRow?.n ?? 0, page: safePage, pageSize: safePageSize };
}
