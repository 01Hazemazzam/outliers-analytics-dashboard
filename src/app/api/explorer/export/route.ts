import { NextRequest, NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { isDatasetKey } from "@/lib/data/config";
import { getExplorerExportRows, type ExplorerFilters } from "@/lib/data/queries/explorer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "boolean" ? (value ? "True" : "False") : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

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

    const sortBy = params.get("sortBy") ?? undefined;
    const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";

    const { columns, rows } = await getExplorerExportRows(dataset, filters, sortBy, sortDir);
    const header = columns.map((c) => csvEscape(c.name)).join(",");
    const lines = rows.map((row) => columns.map((c) => csvEscape(row[c.name])).join(","));
    const csv = [header, ...lines].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${dataset}_export.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error exporting rows." },
      { status: 500 },
    );
  }
}
