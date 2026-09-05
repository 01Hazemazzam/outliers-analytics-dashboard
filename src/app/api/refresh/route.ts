import { NextResponse } from "next/server";
import { refreshData } from "@/lib/data/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: used by the background poll — checks file stamps, only re-ingests what changed.
export async function GET() {
  try {
    const result = await refreshData({ force: false });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error during refresh." },
      { status: 500 },
    );
  }
}

// POST: used by the "Refresh Data" button — same change-detection logic, exposed
// as its own verb so the UI can distinguish a user-initiated refresh from a poll tick.
export async function POST() {
  try {
    const result = await refreshData({ force: false });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error during refresh." },
      { status: 500 },
    );
  }
}
