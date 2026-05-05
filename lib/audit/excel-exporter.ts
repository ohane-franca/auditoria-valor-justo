import ExcelJS from "exceljs";
import type { AuditRow } from "./validator";
import { formatExecTimeBrt } from "@/lib/time/br";

export interface AuditResultRow extends AuditRow {
  result_binance: number | "N/D";
  ptax_data_base: number | "N/D";
  valor_justo: number | "ERRO";
  diferenca_percentual: number | "ERRO";
  status: "APROVADO" | "ALERTA" | "ERRO";
  observacao: string;
}

// ARGB hex colors (FF prefix = fully opaque)
const CLR_WHITE    = "FFFFFFFF";
const CLR_ZEBRA    = "FFF8F9FA";
const CLR_APROVADO = "FFD4EDDA";
const CLR_ALERTA   = "FFF8D7DA";

// Number format strings (Excel syntax)
const FMT_4DP = "0.0000";
const FMT_PCT = '0.00"%"'; // appends literal % without multiplying by 100

type ColType = "string" | "number4" | "percent2";

const COLUMNS: Array<{ key: keyof AuditResultRow; label: string; type: ColType }> = [
  { key: "ticker",               label: "ticker",               type: "string"   },
  { key: "quantidade",           label: "quantidade",           type: "number4"  },
  { key: "valor_declarado",      label: "valor_declarado",      type: "number4"  },
  { key: "data_base",            label: "data_base",            type: "string"   },
  { key: "result_binance",       label: "result_binance",       type: "number4"  },
  { key: "ptax_data_base",       label: "ptax_data_base",       type: "number4"  },
  { key: "valor_justo",          label: "valor_justo",          type: "number4"  },
  { key: "diferenca_percentual", label: "diferenca_percentual", type: "percent2" },
  { key: "status",               label: "status",               type: "string"   },
  { key: "observacao",           label: "observacao",           type: "string"   },
];

function solidFill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function cellBgColor(
  key: keyof AuditResultRow,
  row: AuditResultRow,
  isZebra: boolean
): string {
  if (key === "status") {
    if (row.status === "APROVADO") return CLR_APROVADO;
    if (row.status === "ALERTA")   return CLR_ALERTA;
  }
  return isZebra ? CLR_ZEBRA : CLR_WHITE;
}

function approxDisplayLen(val: unknown, type: ColType): number {
  if (typeof val === "number") {
    if (type === "percent2") return val.toFixed(2).length + 1; // +1 for %
    return val.toFixed(4).length;
  }
  return String(val).length;
}

function buildResultsSheet(ws: ExcelJS.Worksheet, rows: AuditResultRow[]): void {
  const colWidths = COLUMNS.map((col) => col.label.length);

  ws.columns = COLUMNS.map((col) => ({
    header: col.label,
    key: col.key as string,
  }));

  // Style header row (auto-created by ws.columns)
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = solidFill(CLR_WHITE);
    cell.alignment = { horizontal: "center" };
  });

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const isZebra = r % 2 === 1; // even data rows: white; odd: zebra

    const rowData: Record<string, unknown> = {};
    for (const col of COLUMNS) {
      rowData[col.key as string] = row[col.key];
    }

    const excelRow = ws.addRow(rowData);

    for (let c = 0; c < COLUMNS.length; c++) {
      const col = COLUMNS[c];
      const val = row[col.key];
      const cell = excelRow.getCell(c + 1);
      const bg = cellBgColor(col.key, row, isZebra);

      cell.fill = solidFill(bg);

      if (typeof val === "number" && col.type !== "string") {
        cell.numFmt = col.type === "percent2" ? FMT_PCT : FMT_4DP;
        cell.alignment = { horizontal: "right" };
      } else {
        cell.value = String(val);
        cell.alignment = { horizontal: "left" };
      }

      const len = approxDisplayLen(val, col.type);
      if (len > colWidths[c]) colWidths[c] = len;
    }
  }

  COLUMNS.forEach((_, i) => {
    ws.getColumn(i + 1).width = colWidths[i] + 2;
  });
}

function buildMetadataSheet(ws: ExcelJS.Worksheet): void {
  const execTime = formatExecTimeBrt();

  const entries: [string, string][] = [
    ["Data e hora da execução", execTime],
    ["Versão da ferramenta", "1.0.0"],
    ["APIs consultadas", "Binance API (GET /api/v3/klines, interval=1h), PTAX BCB"],
    [
      "Nota metodológica",
      "valor_justo = preco_binance (close 23h59 BRT) × ptax_venda (BCB). Preço capturado via candle 1h Binance (02:00-02:59 UTC D+1 = 23:00-23:59 BRT). Taxa de câmbio: PTAX venda (BCB).",
    ],
    ["Fuso horário — preços", "BRT (UTC-3)"],
    ["Fuso horário — PTAX",   "UTC-3 (Brasília)"],
  ];

  let maxLabel = 0;

  for (const [label, value] of entries) {
    const excelRow = ws.addRow([label, value]);

    const labelCell = excelRow.getCell(1);
    labelCell.font = { bold: true };
    labelCell.alignment = { horizontal: "left" };

    const valueCell = excelRow.getCell(2);
    valueCell.alignment = { horizontal: "left", wrapText: true };

    if (label.length > maxLabel) maxLabel = label.length;
  }

  ws.getColumn(1).width = maxLabel + 2;
  ws.getColumn(2).width = 80;
}

export async function exportToExcel(rows: AuditResultRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  buildResultsSheet(wb.addWorksheet("Resultados"), rows);
  buildMetadataSheet(wb.addWorksheet("Metadados"));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
