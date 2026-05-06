/**
 * Gera `public/modelo.xlsx` (template de entrada da auditoria).
 *
 * O pacote `xlsx` (SheetJS Community) não persiste negrito/células estilizadas
 * ao gravar .xlsx. Para cabeçalhos em negrito mantendo a API SheetJS, usa-se
 * `xlsx-js-style` apenas neste gerador estático.
 */
import XLSX from "xlsx-js-style";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "public", "modelo.xlsx");

const headers = ["ticker", "quantidade", "valor_declarado", "data_base"];
const dataRows = [
  ["BTC", 2.5, 750000, "2024-12-31"],
  ["ETH", 10, 200000, "2024-12-31"],
];

const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

const headerCellStyle = {
  font: { bold: true },
  alignment: { vertical: "center", horizontal: "left" },
};

for (let c = 0; c < headers.length; c++) {
  const addr = XLSX.utils.encode_cell({ r: 0, c });
  const cell = ws[addr];
  if (!cell) continue;
  cell.s = headerCellStyle;
}

const allRows = [headers, ...dataRows];
ws["!cols"] = headers.map((_, colIdx) => {
  let max = headers[colIdx].length;
  for (const row of allRows) {
    max = Math.max(max, String(row[colIdx] ?? "").length);
  }
  return { wch: max + 2 };
});

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Planilha");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
XLSX.writeFile(wb, outPath);

console.log(`modelo.xlsx gravado em: ${outPath}`);
