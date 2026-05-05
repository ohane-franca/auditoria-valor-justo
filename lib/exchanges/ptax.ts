// PTAX BCB: GET CotacaoDolarDia — taxa de câmbio venda em UTC-3 (Brasília)
// API pública — sem autenticação
// date format aceito pela API: MM-DD-YYYY (converter de YYYY-MM-DD)

const BASE_URL = "https://olinda.bcb.gov.br";
const ODATA_PATH =
  "/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)";

const RETRY_DELAYS_MS = [500, 1_000, 2_000];
const MAX_RETROACTIVE_DAYS = 5;

export type PtaxResult = {
  rate: number;
  dateUsed: string; // YYYY-MM-DD; difere de `date` quando dia retroativo foi usado
};

type BcbResponse = {
  value: Array<{
    cotacaoVenda: number;
    dataHoraCotacao: string;
  }>;
};

// YYYY-MM-DD → MM-DD-YYYY (formato exigido pela API do BCB)
function toApiDateFormat(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${month}-${day}-${year}`;
}

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// "empty" = value[] vazio (feriado/fim de semana) → tentar dia anterior
// null    = erro irrecuperável (timeout, retries esgotados)
async function fetchCotacao(
  dateStr: string // YYYY-MM-DD
): Promise<number | "empty" | null> {
  const apiDate = toApiDateFormat(dateStr);
  // Parâmetros OData com $ e @ não devem ser percent-encoded — construção manual
  const url =
    `${BASE_URL}${ODATA_PATH}` +
    `?@dataCotacao='${apiDate}'` +
    `&$top=1` +
    `&$format=json` +
    `&$select=cotacaoVenda,dataHoraCotacao`;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
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

    // 4xx que não seja 429 — sem retry
    if (!res.ok) return null;

    const data: BcbResponse = await res.json();

    if (!data.value || data.value.length === 0) return "empty";

    const rate = data.value[0].cotacaoVenda;
    return typeof rate === "number" && Number.isFinite(rate) ? rate : null;
  }

  return null;
}

export async function fetchPtax(
  date: string // YYYY-MM-DD
): Promise<PtaxResult | null> {
  for (let dayOffset = 0; dayOffset <= MAX_RETROACTIVE_DAYS; dayOffset++) {
    const dateUsed = subtractDays(date, dayOffset);
    const result = await fetchCotacao(dateUsed);

    if (result === "empty") continue; // feriado/fim de semana — tenta dia anterior
    if (result === null) return null; // erro irrecuperável

    return { rate: result, dateUsed };
  }

  return null; // 5 dias retroativos esgotados
}
