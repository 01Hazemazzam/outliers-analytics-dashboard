import { NextRequest, NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { getMarketingData, type MarketingFilters } from "@/lib/data/queries/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Safety margin for a cold-start ingestion pass on Vercel's serverless runtime.
export const maxDuration = 30;

function parseFilters(searchParams: URLSearchParams): MarketingFilters {
  const filters: MarketingFilters = {};
  const platform = searchParams.get("platform");
  const campaignType = searchParams.get("campaignType");
  const industry = searchParams.get("industry");
  const objective = searchParams.get("objective");
  const search = searchParams.get("search");
  if (platform) filters.platform = platform;
  if (campaignType) filters.campaignType = campaignType;
  if (industry) filters.industry = industry;
  if (objective) filters.objective = objective;
  if (search) filters.search = search;
  return filters;
}

export async function GET(request: NextRequest) {
  try {
    await ensureDataLoaded();
    const filters = parseFilters(request.nextUrl.searchParams);
    const data = await getMarketingData(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error loading marketing data." },
      { status: 500 },
    );
  }
}
