import { NextRequest, NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { getInventoryData, type InventoryFilters } from "@/lib/data/queries/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Safety margin for a cold-start ingestion pass on Vercel's serverless runtime.
export const maxDuration = 30;

function parseFilters(searchParams: URLSearchParams): InventoryFilters {
  const filters: InventoryFilters = {};
  const category = searchParams.get("category");
  const supplier = searchParams.get("supplier");
  const warehouse = searchParams.get("warehouse");
  const stockStatus = searchParams.get("stockStatus");
  const search = searchParams.get("search");
  if (category) filters.category = category;
  if (supplier) filters.supplier = supplier;
  if (warehouse) filters.warehouse = warehouse;
  if (stockStatus) filters.stockStatus = stockStatus;
  if (search) filters.search = search;
  return filters;
}

export async function GET(request: NextRequest) {
  try {
    await ensureDataLoaded();
    const filters = parseFilters(request.nextUrl.searchParams);
    const data = await getInventoryData(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error loading inventory data." },
      { status: 500 },
    );
  }
}
