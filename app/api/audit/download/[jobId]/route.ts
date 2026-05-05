import { NextRequest, NextResponse } from "next/server";
import jobs from "@/store/jobs";

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
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  const datePart =
    `${brt.getUTCFullYear()}${p(brt.getUTCMonth() + 1)}${p(brt.getUTCDate())}` +
    `_${p(brt.getUTCHours())}${p(brt.getUTCMinutes())}${p(brt.getUTCSeconds())}`;
  const filename = `Teste_ValorJusto_${datePart}.xlsx`;

  return new Response(new Uint8Array(job.result), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
