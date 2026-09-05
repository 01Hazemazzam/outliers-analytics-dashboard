import { NextResponse } from "next/server";
import { ensureDataLoaded } from "@/lib/data/ingest";
import { getCustomerProfile } from "@/lib/data/queries/customers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Safety margin for a cold-start ingestion pass on Vercel's serverless runtime.
export const maxDuration = 30;

export async function GET(_request: Request, context: { params: Promise<{ customerId: string }> }) {
  try {
    await ensureDataLoaded();
    const { customerId } = await context.params;
    const profile = await getCustomerProfile(customerId);
    if (!profile) {
      return NextResponse.json({ error: `Customer ${customerId} not found.` }, { status: 404 });
    }
    return NextResponse.json({ data: profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error loading customer profile." },
      { status: 500 },
    );
  }
}
