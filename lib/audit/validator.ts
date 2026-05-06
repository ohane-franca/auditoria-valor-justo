import * as XLSX from "xlsx";

export interface AuditRow {
  ticker: string;
  quantidade: number;
  valor_declarado: number;
  data_base: string; // YYYY-MM-DD
}

const REQUIRED_COLUMNS = ["ticker", "quantidade", "valor_declarado", "data_base"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cellToDateString(val: unknown): string {
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val ?? "").trim();
}

export function validateSpreadsheet(
  buffer: Buffer
): { rows: AuditRow[]; errors: string[] } {
  const errors: string[] = [];
  const rows: AuditRow[] = [];

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    return { rows: [], errors: ["Arquivo inválido ou corrompido."] };
  }

  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: ["Planilha sem abas."] };
  }

  const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: "",
  });

  if (raw.length < 2) {
    return { rows: [], errors: ["Planilha sem dados (necessário pelo menos 1 linha de dados além do cabeçalho)."] };
  }

  const headers = (raw[0] as unknown[]).map((h) => String(h).trim().toLowerCase());

  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      errors.push(`Colunas obrigatórias ausentes: ${col}`);
    }
  }
  if (errors.length > 0) return { rows: [], errors };

  const idx: Record<string, number> = {};
  for (const col of REQUIRED_COLUMNS) {
    idx[col] = headers.indexOf(col);
  }

  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    const line = i + 1;

    const tickerRaw = String(row[idx.ticker] ?? "").trim();
    const qtdRaw = row[idx.quantidade];
    const valRaw = row[idx.valor_declarado];
    const dataRaw = cellToDateString(row[idx.data_base]);

    // skip completely empty rows
    if (!tickerRaw && (qtdRaw === "" || qtdRaw == null) && (valRaw === "" || valRaw == null) && !dataRaw) {
      continue;
    }

    if (!tickerRaw) {
      errors.push(`Linha ${line}: ticker vazio.`);
      continue;
    }

    if (qtdRaw === "" || qtdRaw == null) {
      errors.push(`Linha ${line}: quantidade vazia.`);
      continue;
    }
    const quantidade = Number(qtdRaw);
    if (isNaN(quantidade)) {
      errors.push(`Linha ${line}: quantidade não numérica (recebido: ${qtdRaw}).`);
      continue;
    }

    if (valRaw === "" || valRaw == null) {
      errors.push(`Linha ${line}: valor_declarado vazio.`);
      continue;
    }
    const valorDeclarado = Number(valRaw);
    if (isNaN(valorDeclarado)) {
      errors.push(`Linha ${line}: valor_declarado não numérico (recebido: ${valRaw}).`);
      continue;
    }

    if (!dataRaw) {
      errors.push(`Linha ${line}: data_base vazia.`);
      continue;
    }
    if (!DATE_RE.test(dataRaw)) {
      errors.push(`Linha ${line}: data_base fora do formato YYYY-MM-DD (recebido: ${dataRaw}).`);
      continue;
    }
    if (isNaN(new Date(dataRaw).getTime())) {
      errors.push(`Linha ${line}: data_base inválida (${dataRaw}).`);
      continue;
    }
    const dataBase = new Date(`${dataRaw}T00:00:00.000Z`);
    if (dataBase >= hoje) {
      errors.push(
        `Linha ${line}: data_base deve ser uma data passada (não pode ser hoje ou futura) (${dataRaw}).`
      );
      continue;
    }

    rows.push({ ticker: tickerRaw, quantidade, valor_declarado: valorDeclarado, data_base: dataRaw });
  }

  return { rows, errors };
}
