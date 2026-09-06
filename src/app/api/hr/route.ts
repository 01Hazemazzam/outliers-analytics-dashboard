import { NextRequest, NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { getHrData, type HrFilters } from "@/lib/data/queries/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Safety margin for a cold-start ingestion pass on Vercel's serverless runtime.
export const maxDuration = 30;

function parseFilters(searchParams: URLSearchParams): HrFilters {
  const filters: HrFilters = {};
  const department = searchParams.get("department");
  const location = searchParams.get("location");
  const education = searchParams.get("education");
  const performanceRating = searchParams.get("performanceRating");
  const search = searchParams.get("search");
  if (department) filters.department = department;
  if (location) filters.location = location;
  if (education) filters.education = education;
  if (performanceRating) filters.performanceRating = performanceRating;
  if (search) filters.search = search;
  return filters;
}

export async function GET(request: NextRequest) {
  try {
    await ensureDataLoaded();
    const filters = parseFilters(request.nextUrl.searchParams);
    const data = await getHrData(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error loading HR data." },
      { status: 500 },
    );
  }
}
