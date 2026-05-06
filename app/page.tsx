"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { UploadDropzone } from "@/components/ui/UploadDropzone";

type Phase = "idle" | "processing" | "result" | "error";

type AuditSummary = {
  total: number;
  aprovado: number;
  alerta: number;
  erro: number;
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [dropzoneKey, setDropzoneKey] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [errorTitle, setErrorTitle] = useState("Erro");
  const esRef = useRef<EventSource | null>(null);
  const sseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollIntervalRef.current != null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  function stopJobTimeout() {
    if (sseTimeoutRef.current != null) {
      clearTimeout(sseTimeoutRef.current);
      sseTimeoutRef.current = null;
    }
  }

  useEffect(
    () => () => {
      esRef.current?.close();
      if (sseTimeoutRef.current != null) clearTimeout(sseTimeoutRef.current);
      if (pollIntervalRef.current != null) clearInterval(pollIntervalRef.current);
    },
    []
  );

  async function handleProcess() {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    let res: Response;
    try {
      res = await fetch("/api/audit/start", { method: "POST", body: formData });
    } catch {
      setErrorTitle("Erro de conexão");
      setErrors(["Não foi possível conectar ao servidor."]);
      setPhase("error");
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorTitle("Planilha inválida");
      setErrors(data.details ?? [data.error ?? "Erro desconhecido."]);
      setPhase("error");
      return;
    }

    const body = (await res.json()) as { jobId: string; total?: number };
    const id = body.jobId;
    const totalLinhas = typeof body.total === "number" ? body.total : 0;
    setJobId(id);
    setProgress({ processed: 0, total: totalLinhas });
    setPhase("processing");

    stopPolling();

    let consecutiveStatus404 = 0;

    const es = new EventSource(`/api/audit/progress/${id}`);
    esRef.current = es;

    const pollOnce = async (): Promise<boolean> => {
      try {
        const r = await fetch(`/api/audit/status/${id}`, { cache: "no-store" });

        if (r.status === 404) {
          consecutiveStatus404++;
          if (consecutiveStatus404 >= 2) {
            stopJobTimeout();
            stopPolling();
            esRef.current?.close();
            setErrorTitle("Erro no processamento");
            setErrors([
              "Job não encontrado neste servidor. Isso costuma ocorrer ao usar várias réplicas ou workers (cada instância tem sua própria memória), ou após reinício do servidor. Configure uma única instância, sessão afín ao mesmo worker, ou um armazenamento compartilhado para jobs.",
            ]);
            setPhase("error");
            return true;
          }
          return false;
        }

        consecutiveStatus404 = 0;

        if (!r.ok) return false;

        const j = (await r.json()) as {
          status: string;
          processed: number;
          total: number;
          summary: AuditSummary | null;
          error: string | null;
        };
        setProgress({ processed: j.processed ?? 0, total: j.total ?? 0 });
        if (j.status === "done" && j.summary) {
          stopJobTimeout();
          stopPolling();
          esRef.current?.close();
          setSummary(j.summary);
          setPhase("result");
          return true;
        }
        if (j.status === "error") {
          stopJobTimeout();
          stopPolling();
          esRef.current?.close();
          setErrorTitle("Erro no processamento");
          setErrors([j.error ?? "Erro desconhecido"]);
          setPhase("error");
          return true;
        }
      } catch {
        /* ignorar falha transitória de rede */
      }
      return false;
    };

    void pollOnce();
    pollIntervalRef.current = setInterval(() => void pollOnce(), 2000);

    sseTimeoutRef.current = setTimeout(() => {
      esRef.current?.close();
      stopPolling();
      sseTimeoutRef.current = null;
      setErrorTitle("Tempo limite excedido");
      setErrors(["Tempo limite excedido. Tente novamente."]);
      setPhase("error");
    }, 300_000);

    es.onmessage = (e) => {
      let event: { type: string; processed?: number; total?: number; summary?: AuditSummary; message?: string };
      try {
        event = JSON.parse(e.data);
      } catch {
        return;
      }
      if (event.type === "progress") {
        setProgress({
          processed: event.processed ?? 0,
          total: event.total ?? 0,
        });
      } else if (event.type === "done" && event.summary) {
        stopJobTimeout();
        stopPolling();
        es.close();
        setSummary(event.summary);
        setPhase("result");
      } else if (event.type === "error") {
        stopJobTimeout();
        stopPolling();
        es.close();
        setErrorTitle("Erro no processamento");
        setErrors([event.message ?? "Erro desconhecido"]);
        setPhase("error");
      }
    };

    es.onerror = () => {
      es.close();
    };
  }

  function handleDownload() {
    if (!jobId) return;
    const a = document.createElement("a");
    a.href = `/api/audit/download/${jobId}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function reset() {
    esRef.current?.close();
    stopJobTimeout();
    stopPolling();
    setPhase("idle");
    setFile(null);
    setDropzoneKey((k) => k + 1);
    setJobId(null);
    setProgress({ processed: 0, total: 0 });
    setSummary(null);
    setErrors([]);
    setErrorTitle("Erro");
  }

  const pct =
    progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-background)",
      }}
    >
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--spacing-8) var(--spacing-4)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "800px",
            display: "flex",
            flexDirection: "column",
            gap: "var(--spacing-8)",
          }}
        >
          {/* Page title */}
          <h1
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "var(--font-weight-title)",
              color: "var(--color-primary)",
              margin: 0,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            Teste de Mensuração de Valor Justo
          </h1>

          {/* ── Fase 1: Idle ── */}
          {phase === "idle" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--spacing-6)",
              }}
            >
              <UploadDropzone key={dropzoneKey} onChange={setFile} />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--spacing-4)",
                }}
              >
                <a
                  href="/modelo.xlsx"
                  download
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-secondary)",
                    textDecoration: "underline",
                    fontFamily: "var(--font-family)",
                  }}
                >
                  Baixar planilha modelo
                </a>

                <button
                  onClick={handleProcess}
                  disabled={!file}
                  style={{
                    backgroundColor: file
                      ? "var(--color-secondary)"
                      : "var(--border-color)",
                    color: file
                      ? "var(--color-surface)"
                      : "var(--color-text-muted)",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--spacing-3) var(--spacing-12)",
                    fontSize: "var(--font-size-md)",
                    fontWeight: "var(--font-weight-title)",
                    fontFamily: "var(--font-family)",
                    cursor: file ? "pointer" : "not-allowed",
                    transition: "background-color 0.2s ease, color 0.2s ease",
                  }}
                >
                  Processar
                </button>
              </div>
            </div>
          )}

          {/* ── Fase 2: Processando ── */}
          {phase === "processing" && (
            <div
              style={{
                backgroundColor: "var(--color-surface)",
                border: "var(--border-width) solid var(--border-color)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--spacing-12) var(--spacing-8)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--spacing-6)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <h2
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-title)",
                  color: "var(--color-primary)",
                  margin: 0,
                }}
              >
                Processando…
              </h2>

              {/* Progress bar */}
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--spacing-2)",
                }}
              >
                <div
                  style={{
                    height: "8px",
                    backgroundColor: "var(--border-color)",
                    borderRadius: "var(--radius-pill)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      backgroundColor: "var(--color-secondary)",
                      borderRadius: "var(--radius-pill)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-muted)",
                    margin: 0,
                    fontFamily: "var(--font-family)",
                    textAlign: "center",
                  }}
                >
                  {`${progress.processed} de ${progress.total} linha${progress.total === 1 ? "" : "s"}`}
                </p>
              </div>

              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-muted)",
                  margin: 0,
                  textAlign: "center",
                  lineHeight: 1.7,
                }}
              >
                Consultando Binance e PTAX BCB.
                <br />
                Não feche esta janela.
              </p>
            </div>
          )}

          {/* ── Fase 3: Resultado ── */}
          {phase === "result" && summary && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--spacing-6)",
              }}
            >
              <h2
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-title)",
                  color: "var(--color-primary)",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                Processamento concluído
              </h2>

              {/* Metric cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "var(--spacing-4)",
                }}
              >
                <MetricCard count={summary.total} label="Total" variant="neutral" />
                <MetricCard
                  count={summary.aprovado}
                  label="Aprovado"
                  variant="aprovado"
                />
                <MetricCard
                  count={summary.alerta}
                  label="Alerta"
                  variant="alerta"
                />
                <MetricCard count={summary.erro} label="Erro" variant="erro" />
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: "var(--spacing-4)",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={handleDownload}
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-surface)",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--spacing-3) var(--spacing-8)",
                    fontSize: "var(--font-size-md)",
                    fontWeight: "var(--font-weight-title)",
                    fontFamily: "var(--font-family)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--spacing-2)",
                  }}
                >
                  <Download size={16} /> Baixar resultado
                </button>

                <button
                  onClick={reset}
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--color-secondary)",
                    border: "var(--border-width) solid var(--color-secondary)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--spacing-3) var(--spacing-8)",
                    fontSize: "var(--font-size-md)",
                    fontWeight: "var(--font-weight-title)",
                    fontFamily: "var(--font-family)",
                    cursor: "pointer",
                  }}
                >
                  Nova auditoria
                </button>
              </div>
            </div>
          )}

          {/* ── Fase 4: Erro ── */}
          {phase === "error" && (
            <div
              style={{
                backgroundColor: "var(--status-alerta-bg)",
                borderRadius: "var(--radius-lg)",
                borderLeft: "4px solid var(--status-alerta-text)",
                padding: "var(--spacing-8)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--spacing-6)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <h2
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-title)",
                  color: "var(--status-alerta-text)",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-2)",
                }}
              >
                ✕ {errorTitle}
              </h2>

              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--spacing-2)",
                }}
              >
                {errors.map((msg, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--status-alerta-text)",
                      display: "flex",
                      gap: "var(--spacing-2)",
                      alignItems: "flex-start",
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>•</span>
                    {msg}
                  </li>
                ))}
              </ul>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={reset}
                  style={{
                    backgroundColor: "var(--color-secondary)",
                    color: "var(--color-surface)",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--spacing-3) var(--spacing-8)",
                    fontSize: "var(--font-size-md)",
                    fontWeight: "var(--font-weight-title)",
                    fontFamily: "var(--font-family)",
                    cursor: "pointer",
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer
        style={{
          textAlign: "center",
          padding: "var(--spacing-4)",
          borderTop: "var(--border-width) solid var(--border-color)",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-muted)",
          fontFamily: "var(--font-family)",
        }}
      >
        v1.0.0
      </footer>
    </div>
  );
}
