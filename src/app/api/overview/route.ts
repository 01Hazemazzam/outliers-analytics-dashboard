import { NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { getExecutiveOverview } from "@/lib/data/queries/executive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const refresh = await ensureDataLoaded();
    const overview = await getExecutiveOverview();
    return NextResponse.json({ overview, refresh });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error loading overview data." },
      { status: 500 },
    );
  }
}
