export interface PriceResult {
  preco: number;
  alerta: string;
}

// calcMediana([96200, 96500, 96400]) → 96400
// calcMediana([96200, 96500])        → 96350 (média dos dois)
// calcMediana([])                    → Error
export function calcMediana(values: number[]): number {
  if (values.length === 0) throw new Error("calcMediana: array vazio");

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

// calcularPrecoReferencia(96200, 96500, 96400)
//   → { preco: 96400, alerta: "" }
//
// calcularPrecoReferencia(96200, null, null)
//   → { preco: 96200, alerta: "ATENÇÃO — fonte única, revisão obrigatória" }
//
// calcularPrecoReferencia(96200, 96500, null)
//   → { preco: 96350, alerta: "ATENÇÃO — apenas 2 fontes disponíveis" }
//
// calcularPrecoReferencia(96200, 98700, null)  (desvio ~2.6%)
//   → { preco: 97450, alerta: "VERIFICAR — desvio de 2.6% na Binance; VERIFICAR — desvio de 2.6% na Coinbase" }
//
// calcularPrecoReferencia(null, null, null)
//   → Error "Nenhuma fonte disponível"
export function calcularPrecoReferencia(
  binance: number | null,
  coinbase: number | null,
  bybit: number | null
): PriceResult {
  const disponiveis = [binance, coinbase, bybit].filter(
    (v): v is number => v !== null
  );

  if (disponiveis.length === 0) {
    throw new Error("Nenhuma fonte disponível");
  }

  if (disponiveis.length === 1) {
    return {
      preco: disponiveis[0],
      alerta: "ATENÇÃO — fonte única, revisão obrigatória",
    };
  }

  const mediana = calcMediana(disponiveis);

  const fontes = [
    { nome: "Binance", valor: binance },
    { nome: "Coinbase", valor: coinbase },
    { nome: "Bybit", valor: bybit },
  ];

  const alertasDesvio: string[] = [];
  for (const f of fontes) {
    if (f.valor === null) continue;
    const desvio = Math.abs((f.valor - mediana) / mediana) * 100;
    if (desvio > 1.5) {
      alertasDesvio.push(
        `VERIFICAR — desvio de ${desvio.toFixed(1)}% na ${f.nome}`
      );
    }
  }

  let alerta = "";
  if (disponiveis.length === 2) {
    alerta = "ATENÇÃO — apenas 2 fontes disponíveis";
  }
  if (alertasDesvio.length > 0) {
    alerta = alertasDesvio.join("; ");
  }

  return { preco: mediana, alerta };
}

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
