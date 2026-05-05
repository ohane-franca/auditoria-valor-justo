import { NextRequest, NextResponse } from "next/server";
import jobs from "@/store/jobs";
import { formatFilenameTimestampBrt } from "@/lib/time/br";

type Params = Promise<{ jobId: string }>;

export async function GET(
  _req: NextRequest,
  { params }: { params: Params }
): Promise<Response> {
  const { jobId } = await params;

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
