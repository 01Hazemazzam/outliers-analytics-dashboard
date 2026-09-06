import { NextRequest, NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { isDatasetKey } from "@/lib/data/config";
import { getExplorerRows, type ExplorerFilters } from "@/lib/data/queries/explorer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    await ensureDataLoaded();
    const params = request.nextUrl.searchParams;
    const dataset = params.get("dataset");
    if (!isDatasetKey(dataset)) {
      return NextResponse.json({ error: "Unknown or missing dataset." }, { status: 400 });
    }

    const filters: ExplorerFilters = {};
    const search = params.get("search");
    const filterColumn = params.get("filterColumn");
    const filterValue = params.get("filterValue");
    if (search) filters.search = search;
    if (filterColumn) filters.filterColumn = filterColumn;
    if (filterValue) filters.filterValue = filterValue;

    const page = Number(params.get("page") ?? "1");
    const pageSize = Number(params.get("pageSize") ?? "25");
    const sortBy = params.get("sortBy") ?? undefined;
    const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";

    const data = await getExplorerRows(dataset, filters, page, pageSize, sortBy, sortDir);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error loading rows." },
      { status: 500 },
    );
  }
}
