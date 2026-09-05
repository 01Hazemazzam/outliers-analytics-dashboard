import { NextRequest, NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { getSalesData, type SalesFilters } from "@/lib/data/queries/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseFilters(searchParams: URLSearchParams): SalesFilters {
  const filters: SalesFilters = {};
  const category = searchParams.get("category");
  const region = searchParams.get("region");
  const channel = searchParams.get("channel");
  const paymentMethod = searchParams.get("paymentMethod");
  const gender = searchParams.get("gender");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");
  if (category) filters.category = category;
  if (region) filters.region = region;
  if (channel) filters.channel = channel;
  if (paymentMethod) filters.paymentMethod = paymentMethod;
  if (gender) filters.gender = gender;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  if (search) filters.search = search;
  return filters;
}

export async function GET(request: NextRequest) {
  try {
    await ensureDataLoaded();
    const filters = parseFilters(request.nextUrl.searchParams);
    const data = await getSalesData(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error loading sales data." },
      { status: 500 },
    );
  }
}
