import jobs from "@/store/jobs";
import type { AuditSummary } from "@/store/jobs";
import { fetchBinanceClose, fetchBinanceClose21 } from "@/lib/exchanges/binance";
import { USD_STABLECOINS } from "@/lib/exchanges/token-config";
import { fetchPtax } from "@/lib/exchanges/ptax";
import { calcularStatus } from "@/lib/audit/price-calculator";
import { exportToExcel } from "@/lib/audit/excel-exporter";
import type { AuditResultRow } from "@/lib/audit/excel-exporter";
import {
  OBS_ALIAS,
  OBS_BINANCE_INDISPONIVEL,
  OBS_PTAX_INDISPONIVEL,
  OBS_QUANTIDADE_NEGATIVA,
  OBS_QUANTIDADE_ZERO,
  OBS_STABLECOIN,
} from "@/lib/audit/constants";

export async function runAuditJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job || !job.rows) return;

  job.status = "processing";

  const results: AuditResultRow[] = [];

  console.info(
    "[audit]",
    JSON.stringify({ event: "job_start", jobId, totalRows: job.rows.length })
  );

  try {
    for (const row of job.rows) {
      const rowStarted = Date.now();

      // Step 1: fetch sources in parallel
      const [binanceResult, binance21Result, ptaxResult] = await Promise.all([
        fetchBinanceClose(row.ticker, row.data_base).catch(() => null),
        fetchBinanceClose21(row.ticker, row.data_base).catch(() => null),
        fetchPtax(row.data_base).catch(() => null),
      ]);

      const close_USDT_BRT: number | "N/D" = binanceResult?.price ?? "N/D";
      const close_21UTC_USD: number | "N/D" = binance21Result?.price ?? "N/D";
      const ptax_data_base: number | "N/D" = ptaxResult?.rate ?? "N/D";

      // Build observacao from retroactive date fallbacks
      const observacoes: string[] = [];
      if (binanceResult && binanceResult.dateUsed !== row.data_base) {
        observacoes.push(`Fechamento utilizado: ${binanceResult.dateUsed} (data_base indisponível)`);
      }
      if (binance21Result && binance21Result.dateUsed !== row.data_base) {
        observacoes.push(`Fechamento 21h UTC utilizado: ${binance21Result.dateUsed} (data_base indisponível)`);
      }
      if (ptaxResult && ptaxResult.dateUsed !== row.data_base) {
        observacoes.push(`PTAX utilizada: ${ptaxResult.dateUsed} (data_base sem cotação)`);
      }

      const aliasUsed = binanceResult?.aliasUsed ?? binance21Result?.aliasUsed ?? null;
      if (aliasUsed !== null) {
        observacoes.push(OBS_ALIAS(row.ticker, aliasUsed));
      }

      const tickerUpper = row.ticker.toUpperCase();
      const stableUsdRow =
        USD_STABLECOINS.has(tickerUpper) &&
        ((typeof close_USDT_BRT === "number" && close_USDT_BRT === 1.0) ||
          (typeof close_21UTC_USD === "number" && close_21UTC_USD === 1.0));
      if (stableUsdRow) {
        observacoes.push(OBS_STABLECOIN);
      }

      // Step 2: valor_justo = close_USDT_BRT × quantidade × ptax_data_base (BRL total)
      let valor_justo: number | "N/D" = "N/D";
      let valor_declarado_x_valor_justo: number | "N/D" = "N/D";
      let status: "APROVADO" | "ALERTA" | "ERRO" = "ERRO";

      if (row.quantidade === 0) {
        valor_declarado_x_valor_justo = "N/D";
        observacoes.push(OBS_QUANTIDADE_ZERO);
      } else if (
        typeof close_USDT_BRT === "number" &&
        typeof ptax_data_base === "number"
      ) {
        const qtdParaCalculo =
          row.quantidade < 0 ? Math.abs(row.quantidade) : row.quantidade;
        if (row.quantidade < 0) {
          observacoes.push(OBS_QUANTIDADE_NEGATIVA);
        }
        valor_justo = close_USDT_BRT * qtdParaCalculo * ptax_data_base;
        const calc = calcularStatus(row.valor_declarado, valor_justo);
        valor_declarado_x_valor_justo = calc.valor_declarado_x_valor_justo;
        status = calc.status;
      } else if (typeof close_USDT_BRT !== "number") {
        observacoes.push(OBS_BINANCE_INDISPONIVEL);
      } else {
        observacoes.push(OBS_PTAX_INDISPONIVEL);
      }

      results.push({
        ...row,
        close_USDT_BRT,
        close_21UTC_USD,
        ptax_data_base,
        valor_justo,
        valor_declarado_x_valor_justo,
        status,
        observacao: observacoes.join("; "),
      });

      job.processed++;

      console.info(
        "[audit]",
        JSON.stringify({
          event: "row_done",
          jobId,
          ticker: row.ticker,
          processed: job.processed,
          total: job.total,
          rowMs: Date.now() - rowStarted,
        })
      );
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

    console.info(
      "[audit]",
      JSON.stringify({ event: "job_done", jobId, summary })
    );
  } catch (err) {
    job.status = "error";
    job.error = err instanceof Error ? err.message : "Erro desconhecido";

    console.info(
      "[audit]",
      JSON.stringify({
        event: "job_error",
        jobId,
        error: job.error,
      })
    );
  }
}
