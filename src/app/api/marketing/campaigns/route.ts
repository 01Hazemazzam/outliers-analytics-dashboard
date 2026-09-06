import { NextRequest, NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { getCampaignRows, type MarketingFilters } from "@/lib/data/queries/marketing";

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
    const params = request.nextUrl.searchParams;
    const filters = parseFilters(params);
    const page = Number(params.get("page") ?? "1");
    const pageSize = Number(params.get("pageSize") ?? "25");
    const sortBy = params.get("sortBy") ?? "revenue_generated";
    const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";

    const data = await getCampaignRows(filters, page, pageSize, sortBy, sortDir);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error loading campaigns." },
      { status: 500 },
    );
  }
}
