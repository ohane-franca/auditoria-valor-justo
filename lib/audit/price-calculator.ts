// calcularStatus(valorDeclarado, quantidade, valorJusto)
// Todos os valores em BRL. valorJusto já convertido via PTAX (BRL/unidade).
//
// Exemplo 1 — APROVADO:
//   calcularStatus(578400, 6, 96400)
//   valorPorUnidade = 96400
//   diferenca = |96400 - 96400| / 96400 × 100 = 0,0% → "APROVADO"
//
// Exemplo 2 — ALERTA:
//   calcularStatus(590000, 6, 96400)
//   valorPorUnidade = 98333,33
//   diferenca = |98333,33 - 96400| / 96400 × 100 = 2,01% → "ALERTA"
export function calcularStatus(
  valorDeclarado: number,
  quantidade: number,
  valorJusto: number
): { diferenca_percentual: number; status: "APROVADO" | "ALERTA" } {
  const valorPorUnidade = valorDeclarado / quantidade;
  const diferenca_percentual =
    Math.abs((valorPorUnidade - valorJusto) / valorJusto) * 100;
  const status = diferenca_percentual > 1.5 ? "ALERTA" : "APROVADO";

  return { diferenca_percentual, status };
}
