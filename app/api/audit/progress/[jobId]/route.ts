import { NextRequest } from "next/server";
import jobs from "@/store/jobs";

/** SSE longo — não cachear; Node para stream estável (evitar Edge matando conexão). */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = Promise<{ jobId: string }>;

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Params }
): Promise<Response> {
  const { jobId } = await params;

  if (!UUID_V4_RE.test(jobId)) {
    return new Response(JSON.stringify({ error: "INVALID_JOB_ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return new Response(JSON.stringify({ error: "JOB_NOT_FOUND" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      function safeEnqueue(chunk: Uint8Array) {
        try {
          controller.enqueue(chunk);
        } catch {
          cancelled = true;
        }
      }

      function send(obj: object) {
        safeEnqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }

      /** Comentário SSE: mantém a conexão viva quando não há mudança de progresso (proxies ~60s). */
      function ping() {
        safeEnqueue(encoder.encode(": ping\n\n"));
      }

      let lastProcessed = -1;
      let lastPingAt = Date.now();
      const PING_MS = 15_000;

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

        const now = Date.now();
        if (now - lastPingAt >= PING_MS) {
          ping();
          lastPingAt = now;
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
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // nginx / alguns proxies: evitar buffering que fecha SSE “cedo”
      "X-Accel-Buffering": "no",
    },
  });
}
