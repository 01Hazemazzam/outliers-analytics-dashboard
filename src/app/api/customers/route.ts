import { NextRequest, NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { getCustomerData, type CustomerFilters } from "@/lib/data/queries/customers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Safety margin for a cold-start ingestion pass on Vercel's serverless runtime.
export const maxDuration = 30;

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
    const filters = parseFilters(request.nextUrl.searchParams);
    const data = await getCustomerData(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error loading customer data." },
      { status: 500 },
    );
  }
}
