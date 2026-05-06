import { NextRequest, NextResponse } from "next/server";
import jobs from "@/store/jobs";
import { formatFilenameTimestampBrt } from "@/lib/time/br";

type Params = Promise<{ jobId: string }>;

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Params }
): Promise<Response> {
  const { jobId } = await params;

  if (!UUID_V4_RE.test(jobId)) {
    return NextResponse.json({ error: "INVALID_JOB_ID" }, { status: 400 });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: "JOB_NOT_FOUND" }, { status: 404 });
  }

  if (job.status !== "done" || !job.result) {
    return NextResponse.json({ error: "JOB_NOT_READY" }, { status: 425 });
  }

  // Filename with execution timestamp in UTC-3 (Brasília)
  const filename = `Teste_ValorJusto_${formatFilenameTimestampBrt()}.xlsx`;

  return new Response(new Uint8Array(job.result), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
