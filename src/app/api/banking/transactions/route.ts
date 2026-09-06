import { NextRequest, NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { getTransactionRows, type BankingFilters } from "@/lib/data/queries/banking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Safety margin for a cold-start ingestion pass on Vercel's serverless runtime.
export const maxDuration = 30;

function parseFilters(searchParams: URLSearchParams): BankingFilters {
  const filters: BankingFilters = {};
  const transactionType = searchParams.get("transactionType");
  const accountType = searchParams.get("accountType");
  const channel = searchParams.get("channel");
  const city = searchParams.get("city");
  const search = searchParams.get("search");
  if (transactionType) filters.transactionType = transactionType;
  if (accountType) filters.accountType = accountType;
  if (channel) filters.channel = channel;
  if (city) filters.city = city;
  if (search) filters.search = search;
  return filters;
}

export async function GET(request: NextRequest) {
  try {
    await ensureDataLoaded();
    const params = request.nextUrl.searchParams;
    const filters = parseFilters(params);
    const page = Number(params.get("page") ?? "1");
    const pageSize = Number(params.get("pageSize") ?? "25");
    const sortBy = params.get("sortBy") ?? "transaction_date";
    const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";

    const data = await getTransactionRows(filters, page, pageSize, sortBy, sortDir);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error loading transactions." },
      { status: 500 },
    );
  }
}
