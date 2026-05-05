export interface TickerSymbols {
  binance: string;  // {ticker}USDT
  coinbase: string; // {ticker}-USD
  bybit: string;    // {ticker}USDT
}

export function mapTicker(ticker: string): TickerSymbols {
  const upper = ticker.toUpperCase();
  return {
    binance: `${upper}USDT`,
    coinbase: `${upper}-USD`,
    bybit: `${upper}USDT`,
  };
}
