// calcularStatus(valorDeclarado, valorJusto)
// Todos os valores em BRL (totais). valorJusto já convertido via PTAX (BRL total).
//
// Exemplo 1 — APROVADO:
//   calcularStatus(1_140_000, 1_140_000)
//   valor_declarado_x_valor_justo = (1.140.000 - 1.140.000) / 1.140.000 × 100 = 0,0% → "APROVADO"
//
// Exemplo 2 — ALERTA:
//   calcularStatus(1_200_000, 1_140_000)
//   valor_declarado_x_valor_justo = (1.200.000 - 1.140.000) / 1.140.000 × 100 = +5,26% → "ALERTA"
import { THRESHOLD_DIVERGENCIA } from "@/lib/audit/constants";

export function calcularStatus(
  valorDeclarado: number,
  valorJusto: number
): { valor_declarado_x_valor_justo: number; status: "APROVADO" | "ALERTA" } {
  const valor_declarado_x_valor_justo =
    ((valorDeclarado - valorJusto) / valorJusto) * 100;
  const status =
    Math.abs(valor_declarado_x_valor_justo) > THRESHOLD_DIVERGENCIA
      ? "ALERTA"
      : "APROVADO";

  return { valor_declarado_x_valor_justo, status };
}
