export async function GET() {
  const url =
    "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=1735693200000&endTime=1735696799999&limit=1";

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
  });

  const status = res.status;
  const body = await res.text();

  return Response.json({ status, body });
}
