import { NextRequest } from "next/server";
import jobs from "@/store/jobs";
import { runAuditJob } from "@/lib/audit/orchestrator";

type Params = Promise<{ jobId: string }>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Params }
): Promise<Response> {
  const { jobId } = await params;

  const job = jobs.get(jobId);
  if (!job) {
    return new Response(JSON.stringify({ error: "JOB_NOT_FOUND" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Start the job in background only if it hasn't started yet
  if (job.status === "pending") {
    job.status = "processing";
    runAuditJob(jobId).catch((err) => {
      const j = jobs.get(jobId);
      if (j && j.status !== "done") {
        j.status = "error";
        j.error = err instanceof Error ? err.message : "Erro desconhecido";
      }
    });
  }

  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }

      let lastProcessed = -1;

      while (!cancelled) {
        const current = jobs.get(jobId);

        if (!current) {
          send({ type: "error", message: "Job não encontrado" });
          break;
        }

        if (current.processed !== lastProcessed) {
          lastProcessed = current.processed;
          send({ type: "progress", processed: current.processed, total: current.total });
        }

        if (current.status === "done") {
          send({ type: "done", summary: current.summary });
          break;
        }

        if (current.status === "error") {
          send({ type: "error", message: current.error ?? "Erro desconhecido" });
          break;
        }

        await sleep(300);
      }

      controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
