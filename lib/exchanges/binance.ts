// Binance: GET /api/v3/klines — preço de fechamento às 23h59:59 BRT
// Candle horário (1h) que abre às 02:00:00 UTC do dia D+1.
// O close desse candle = 02:59:59 UTC D+1 = 23:59:59 BRT D — exato.
// (candle diário da Binance é sempre UTC puro; não existe "candle BRT" nativo)
// Symbol format: {ticker}USDT (ex: BTCUSDT)
// Endpoint público de klines não exige autenticação.
// Mantemos suporte a configuração por .env apenas se houver expansão futura
// (ex.: endpoints privados); nesta versão não usamos BINANCE_API_KEY.

import {
  MAX_RETROACTIVE_DAYS,
  RETROACTIVE_DELAY_MS,
  RETRY_DELAYS_MS,
  USD_STABLECOINS,
  resolveTicker,
} from "@/lib/exchanges/token-config";

const BASE_URL = "https://api.binance.com";

export type BinanceResult = {
  price: number;
  dateUsed: string; // YYYY-MM-DD; difere de `date` quando dia retroativo foi usado
  aliasUsed: string | null;
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Retorna a janela do candle 1h que representa 23:00–23:59:59 BRT do dia dateStr.
// Esse candle abre às 02:00:00 UTC do dia seguinte e fecha às 02:59:59 UTC.
function brtCloseHourMs(dateStr: string): { startTime: number; endTime: number } {
  const nextDay = addDays(dateStr, 1);
  const startTime = new Date(`${nextDay}T02:00:00.000Z`).getTime();
  const endTime   = new Date(`${nextDay}T02:59:59.999Z`).getTime();
  return { startTime, endTime };
}

// Retorna a janela do candle 1h 21:00–21:59:59 UTC do próprio dia dateStr.
function utc21CloseHourMs(dateStr: string): { startTime: number; endTime: number } {
  const startTime = new Date(`${dateStr}T21:00:00.000Z`).getTime();
  const endTime   = new Date(`${dateStr}T21:59:59.999Z`).getTime();
  return { startTime, endTime };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// "empty" = API retornou array vazio (fim de semana/feriado) → tentar dia anterior
// null    = erro irrecuperável (símbolo inválido, retries esgotados)
async function fetchKline(
  symbol: string,
  startTime: number,
  endTime: number
): Promise<number | "empty" | null> {
  const url = new URL("/api/v3/klines", BASE_URL);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1h");
  url.searchParams.set("startTime", String(startTime));
  url.searchParams.set("endTime", String(endTime));
  url.searchParams.set("limit", "1");

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    let res: Response;
    try {
      res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
    } catch {
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      return null;
    }

    if (res.status === 429 || res.status >= 500) {
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      return null;
    }

    // 4xx que não seja 429 (ex: símbolo inválido) — sem retry
    if (!res.ok) return null;

    const data: unknown[][] = await res.json();

    if (!Array.isArray(data) || data.length === 0) return "empty";

    const close = parseFloat(String(data[0][4]));
    return Number.isFinite(close) ? close : null;
  }

  return null;
}

export async function fetchBinanceClose(
  ticker: string,
  date: string // YYYY-MM-DD (data_base em BRT)
): Promise<BinanceResult | null> {
  // Ordem obrigatória: 1) stablecoin (sem API) 2) alias 3) consulta API
  if (USD_STABLECOINS.has(ticker.toUpperCase())) {
    return { price: 1.0, dateUsed: date, aliasUsed: null };
  }

  const resolved = resolveTicker(ticker);
  const symbol = `${resolved.symbol}USDT`;

  for (let dayOffset = 0; dayOffset <= MAX_RETROACTIVE_DAYS; dayOffset++) {
    if (dayOffset > 0) await sleep(RETROACTIVE_DELAY_MS);

    const dateUsed = addDays(date, -dayOffset);
    const { startTime, endTime } = brtCloseHourMs(dateUsed);
    const result = await fetchKline(symbol, startTime, endTime);

    if (result === "empty") continue; // fim de semana/feriado — tenta dia anterior
    if (result === null) return null; // erro irrecuperável

    return { price: result, dateUsed, aliasUsed: resolved.alias };
  }

  return null; // 5 dias retroativos esgotados
}

export async function fetchBinanceClose21(
  ticker: string,
  date: string // YYYY-MM-DD (data_base)
): Promise<BinanceResult | null> {
  // Ordem obrigatória: 1) stablecoin (sem API) 2) alias 3) consulta API
  if (USD_STABLECOINS.has(ticker.toUpperCase())) {
    return { price: 1.0, dateUsed: date, aliasUsed: null };
  }

  const resolved = resolveTicker(ticker);
  const symbol = `${resolved.symbol}USDT`;

  for (let dayOffset = 0; dayOffset <= MAX_RETROACTIVE_DAYS; dayOffset++) {
    if (dayOffset > 0) await sleep(RETROACTIVE_DELAY_MS);

    const dateUsed = addDays(date, -dayOffset);
    const { startTime, endTime } = utc21CloseHourMs(dateUsed);
    const result = await fetchKline(symbol, startTime, endTime);

    if (result === "empty") continue; // fim de semana/feriado — tenta dia anterior
    if (result === null) return null; // erro irrecuperável

    return { price: result, dateUsed, aliasUsed: resolved.alias };
  }

  return null; // 5 dias retroativos esgotados
}
