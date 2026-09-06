import { NextRequest, NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { isDatasetKey } from "@/lib/data/config";
import { getExplorerSchema } from "@/lib/data/queries/explorer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    await ensureDataLoaded();
    const dataset = request.nextUrl.searchParams.get("dataset");
    if (!isDatasetKey(dataset)) {
      return NextResponse.json({ error: "Unknown or missing dataset." }, { status: 400 });
    }
    const data = await getExplorerSchema(dataset);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error loading dataset schema." },
      { status: 500 },
    );
  }
}
