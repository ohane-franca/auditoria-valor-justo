import ExcelJS from "exceljs";
import type { AuditRow } from "./validator";
import { formatExecTimeBrt } from "@/lib/time/br";
import { createHash } from "crypto";
import {
  FONTE_PRECOS,
  FUSO_PRECOS,
  FUSO_PTAX,
  NORMA,
  NOTA_METODOLOGICA,
  TAXA_CAMBIO,
  VERSAO,
} from "@/lib/audit/constants";

export interface AuditResultRow extends AuditRow {
  close_USDT_BRT: number | "N/D";
  close_21UTC_USD: number | "N/D";
  ptax_data_base: number | "N/D";
  valor_justo: number | "N/D";
  valor_declarado_x_valor_justo: number | "N/D";
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

const COLUMNS: Array<{
  key: keyof AuditResultRow;
  label: string;
  type: ColType;
  numFmt?: string;
}> = [
  { key: "ticker",               label: "ticker",               type: "string"   },
  { key: "quantidade",           label: "quantidade",           type: "number4",  numFmt: "0.00000000" },
  { key: "valor_declarado",      label: "valor_declarado",      type: "number4",  numFmt: '"R$ "#,##0.00' },
  { key: "data_base",            label: "data_base",            type: "string"   },
  { key: "close_USDT_BRT",       label: "close_USDT_BRT",       type: "number4",  numFmt: '"$"#,##0.0000' },
  { key: "close_21UTC_USD",      label: "close_21UTC_USD",      type: "number4",  numFmt: '"$"#,##0.0000' },
  { key: "ptax_data_base",       label: "ptax_data_base",       type: "number4",  numFmt: "0.0000" },
  { key: "valor_justo",          label: "valor_justo",          type: "number4",  numFmt: '"R$ "#,##0.00' },
  { key: "valor_declarado_x_valor_justo", label: "valor_declarado_x_valor_justo", type: "percent2", numFmt: '+0.00"%";-0.00"%";0.00"%"' },
  { key: "status",               label: "status",               type: "string"   },
  { key: "observacao",           label: "observacao",           type: "string"   },
];

const CLR_SECTION_BG = "FF1B2A4A"; // #1B2A4A
const CLR_LABEL_BG   = "FFF8F9FA"; // #F8F9FA
const CLR_TEXT_WHITE = "FFFFFFFF";

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
        cell.numFmt = col.numFmt ?? (col.type === "percent2" ? FMT_PCT : FMT_4DP);
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

function buildMetadataSheet(
  ws: ExcelJS.Worksheet,
  rows: AuditResultRow[],
  hash: string
): void {
  ws.getColumn(1).width = 35;
  ws.getColumn(2).width = 60;

  const dataBase = rows[0]?.data_base ?? "N/D";
  const execTime = formatExecTimeBrt();

  const total = rows.length;
  const aprovados = rows.filter((r) => r.status === "APROVADO").length;
  const alertas = rows.filter((r) => r.status === "ALERTA").length;
  const erros = rows.filter((r) => r.status === "ERRO").length;

  function addSection(title: string) {
    const r = ws.addRow([title, ""]);
    ws.mergeCells(r.number, 1, r.number, 2);

    const c = r.getCell(1);
    c.font = { bold: true, color: { argb: CLR_TEXT_WHITE } };
    c.fill = solidFill(CLR_SECTION_BG);
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  function addField(label: string, value: string) {
    const r = ws.addRow([label, value]);

    const labelCell = r.getCell(1);
    labelCell.font = { bold: true };
    labelCell.fill = solidFill(CLR_LABEL_BG);
    labelCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };

    const valueCell = r.getCell(2);
    valueCell.font = {};
    valueCell.fill = solidFill(CLR_WHITE);
    valueCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
  }

  // IDENTIFICAÇÃO
  addSection("IDENTIFICAÇÃO");
  addField("Data-base do teste", dataBase);
  addField("Data e hora da execução", execTime);

  // ESCOPO
  addSection("ESCOPO");
  addField("Total de ativos testados", String(total));
  addField("Aprovados", String(aprovados));
  addField("Alertas", String(alertas));
  addField("Erros", String(erros));

  // BASE TÉCNICA
  addSection("BASE TÉCNICA");
  addField("Versão da ferramenta", VERSAO);
  addField("Norma aplicada", NORMA);
  addField("Fonte de preços", FONTE_PRECOS);
  addField("Taxa de câmbio", TAXA_CAMBIO);

  // METODOLOGIA
  addSection("METODOLOGIA");
  addField("Nota metodológica", NOTA_METODOLOGICA);

  // NOTAS TÉCNICAS
  addSection("NOTAS TÉCNICAS");
  addField("Fuso — preços", FUSO_PRECOS);
  addField("Fuso — PTAX", FUSO_PTAX);

  // INTEGRIDADE
  addSection("INTEGRIDADE");
  addField("Hash SHA-256 (aba Resultados)", hash);
}

function serializeResultsDeterministic(rows: AuditResultRow[]): string {
  const header = COLUMNS.map((c) => c.label).join("|");
  const lines = rows.map((row) =>
    COLUMNS.map((c) => String(row[c.key])).join("|")
  );
  return [header, ...lines].join("\n");
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export async function exportToExcel(rows: AuditResultRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  buildResultsSheet(wb.addWorksheet("Resultados"), rows);

  const deterministic = serializeResultsDeterministic(rows);
  const hash = sha256Hex(deterministic);

  buildMetadataSheet(wb.addWorksheet("Metadados"), rows, hash);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
