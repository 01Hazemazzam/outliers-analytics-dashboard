import { NextRequest, NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { getCustomerRows, type CustomerFilters } from "@/lib/data/queries/customers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseFilters(searchParams: URLSearchParams): CustomerFilters {
  const filters: CustomerFilters = {};
  const segment = searchParams.get("segment");
  const status = searchParams.get("status");
  const country = searchParams.get("country");
  const industry = searchParams.get("industry");
  const acquisitionSource = searchParams.get("acquisitionSource");
  const search = searchParams.get("search");
  if (segment) filters.segment = segment;
  if (status) filters.status = status;
  if (country) filters.country = country;
  if (industry) filters.industry = industry;
  if (acquisitionSource) filters.acquisitionSource = acquisitionSource;
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
    const sortBy = params.get("sortBy") ?? "clv";
    const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";

    const data = await getCustomerRows(filters, page, pageSize, sortBy, sortDir);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error loading customer rows." },
      { status: 500 },
    );
  }
}
