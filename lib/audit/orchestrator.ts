import jobs from "@/store/jobs";
import type { AuditSummary } from "@/store/jobs";
import { fetchBinanceClose } from "@/lib/exchanges/binance";
import { fetchPtax } from "@/lib/exchanges/ptax";
import { calcularStatus } from "@/lib/audit/price-calculator";
import { exportToExcel } from "@/lib/audit/excel-exporter";
import type { AuditResultRow } from "@/lib/audit/excel-exporter";

export async function runAuditJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job || !job.rows) return;

  job.status = "processing";

  const results: AuditResultRow[] = [];

  try {
    for (const row of job.rows) {
      // Step 1: fetch sources in parallel
      const [binanceResult, ptaxResult] = await Promise.all([
        fetchBinanceClose(row.ticker, row.data_base).catch(() => null),
        fetchPtax(row.data_base).catch(() => null),
      ]);

      const result_binance: number | "N/D" = binanceResult?.price ?? "N/D";
      const ptax_data_base: number | "N/D" = ptaxResult?.rate ?? "N/D";

      // Build observacao from retroactive date fallbacks
      const observacoes: string[] = [];
      if (binanceResult && binanceResult.dateUsed !== row.data_base) {
        observacoes.push(`Fechamento utilizado: ${binanceResult.dateUsed} (data_base indisponível)`);
      }
      if (ptaxResult && ptaxResult.dateUsed !== row.data_base) {
        observacoes.push(`PTAX utilizada: ${ptaxResult.dateUsed} (data_base sem cotação)`);
      }

      // Step 2: valor_justo = result_binance × ptax_data_base
      let valor_justo: number | "ERRO" = "ERRO";
      let diferenca_percentual: number | "ERRO" = "ERRO";
      let status: "APROVADO" | "ALERTA" | "ERRO" = "ERRO";

      if (typeof result_binance === "number" && typeof ptax_data_base === "number") {
        valor_justo = result_binance * ptax_data_base;
        const calc = calcularStatus(row.valor_declarado, row.quantidade, valor_justo);
        diferenca_percentual = calc.diferenca_percentual;
        status = calc.status;
      } else if (typeof result_binance !== "number") {
        observacoes.push("Binance indisponível — valor justo não calculado");
      } else {
        observacoes.push("PTAX indisponível — valor justo não calculado");
      }

      results.push({
        ...row,
        result_binance,
        ptax_data_base,
        valor_justo,
        diferenca_percentual,
        status,
        observacao: observacoes.join("; "),
      });

      job.processed++;
    }

    // Step 3: build summary
    const summary: AuditSummary = {
      total: results.length,
      aprovado: results.filter((r) => r.status === "APROVADO").length,
      alerta: results.filter((r) => r.status === "ALERTA").length,
      erro: results.filter((r) => r.status === "ERRO").length,
    };

    // Step 4: export to Excel and persist in job state
    const buffer = await exportToExcel(results);
    job.result = buffer;
    job.summary = summary;
    job.status = "done";
  } catch (err) {
    job.status = "error";
    job.error = err instanceof Error ? err.message : "Erro desconhecido";
  }
}
