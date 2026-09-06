import { NextRequest, NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { isDatasetKey } from "@/lib/data/config";
import { getDistinctColumnValues } from "@/lib/data/queries/explorer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    await ensureDataLoaded();
    const params = request.nextUrl.searchParams;
    const dataset = params.get("dataset");
    const column = params.get("column");
    if (!isDatasetKey(dataset)) {
      return NextResponse.json({ error: "Unknown or missing dataset." }, { status: 400 });
    }
    if (!column) {
      return NextResponse.json({ error: "Missing column." }, { status: 400 });
    }

    const data = await getDistinctColumnValues(dataset, column);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error loading column values." },
      { status: 500 },
    );
  }
}
