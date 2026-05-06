export const MAX_RETROACTIVE_DAYS = 5;
export const RETROACTIVE_DELAY_MS = 100;
export const RETRY_DELAYS_MS = [500, 1_000, 2_000];

export const USD_STABLECOINS = new Set([
  "USDT",
  "USDC",
  "BUSD",
  "TUSD",
  "DAI",
  "USDP",
  "PYUSD",
  "FDUSD",
  "GUSD",
  "FRAX",
  "LUSD",
  "SUSD",
  "USDD",
  "USDJ",
  "CUSD",
  "HUSD",
  "OUSD",
  "RSV",
  "TRIBE",
]);

export const TICKER_ALIASES: Map<string, string> = new Map([
  ["MATIC", "POL"],
  ["RNDR", "RENDER"],
]);

export function resolveTicker(ticker: string): {
  symbol: string;
  alias: string | null;
} {
  const upper = ticker.toUpperCase();
  const alias = TICKER_ALIASES.get(upper) ?? null;
  return {
    symbol: alias ?? upper,
    alias,
  };
}
