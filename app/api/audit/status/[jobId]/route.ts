import { NextResponse } from "next/server";
import jobs from "@/store/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = Promise<{ jobId: string }>;

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Params }
): Promise<NextResponse> {
  const { jobId } = await params;

  if (!UUID_V4_RE.test(jobId)) {
    return NextResponse.json({ error: "INVALID_JOB_ID" }, { status: 400 });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: "JOB_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    processed: job.processed,
    total: job.total,
    summary: job.summary ?? null,
    error: job.error ?? null,
  });
}
