export const VERSAO = "1.0.0";
export const NORMA = "Resolução CMN nº 5.281/2026 / CPC 46";
export const FONTE_PRECOS =
  "Binance API (candle 1h, close 23h59 BRT em USDT) + evidência close_21UTC_USD (21h UTC)";
export const TAXA_CAMBIO = "PTAX venda — Banco Central do Brasil";
export const FUSO_PRECOS =
  "UTC (02:00-02:59 UTC D+1 = 23:00-23:59 BRT)";
export const FUSO_PTAX = "UTC-3 (Brasília)";
export const THRESHOLD_DIVERGENCIA = 1.5;

export const NOTA_METODOLOGICA = `\
Valor justo = close_USDT_BRT (Binance, 23h59 BRT em USDT) × quantidade × \
PTAX venda (BCB). Métrica valor_declarado_x_valor_justo em % com sinal; \
status por valor absoluto com threshold de ${THRESHOLD_DIVERGENCIA}%. \
A coluna close_21UTC_USD (21h UTC) é evidência adicional e não \
afeta o cálculo.

Resolução de tokens: (1) Stablecoins USD — preço fixo $1,0000, \
sem consulta à API. (2) Rebranding — ticker antigo mapeado para \
ticker atual antes da consulta; alias registrado em observacao. \
(3) Par alternativo — previsto para próxima iteração. \
(4) Não listado — status ERRO, sem preço de mercado observável, \
requer critério alternativo de mensuração pelo auditor.

Quantidade negativa: valor justo calculado com Math.abs(quantidade); \
observacao registra a natureza da posição para julgamento do auditor. \
Quantidade zero: valor justo não calculado; status ERRO. \
Valor declarado zero: processado normalmente; \
valor_declarado_x_valor_justo tende a -100%; status ALERTA.`;

export const OBS_STABLECOIN = "Stablecoin USD — preço fixo: $1,0000";
export const OBS_ALIAS = (original: string, novo: string) =>
  `Ticker renomeado: ${original} consultado como ${novo}`;
export const OBS_QUANTIDADE_NEGATIVA =
  "Quantidade negativa — verificar natureza da posição";
export const OBS_QUANTIDADE_ZERO = "Quantidade zero — valor justo não calculado";
export const OBS_BINANCE_INDISPONIVEL =
  "Binance indisponível — valor justo não calculado";
export const OBS_PTAX_INDISPONIVEL =
  "PTAX indisponível — valor justo não calculado";
