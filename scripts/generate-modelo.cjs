// Generates public/modelo.xlsx — run once with: node scripts/generate-modelo.cjs
const XLSX = require("xlsx");
const path = require("path");

const outputPath = path.join(__dirname, "..", "public", "modelo.xlsx");

const wb = XLSX.utils.book_new();

const data = [
  ["ticker", "quantidade", "valor_declarado", "data_base"],
  ["BTC", 2.5, 750000, "2024-12-31"],
  ["ETH", 10, 200000, "2024-12-31"],
];

const ws = XLSX.utils.aoa_to_sheet(data);

// Bold headers (requires pro edition; community silently ignores styles)
for (let c = 0; c < 4; c++) {
  const addr = XLSX.utils.encode_cell({ r: 0, c });
  if (ws[addr]) {
    ws[addr].s = { font: { bold: true } };
  }
}

ws["!cols"] = [
  { wch: 12 }, // ticker
  { wch: 12 }, // quantidade
  { wch: 18 }, // valor_declarado
  { wch: 12 }, // data_base
];

XLSX.utils.book_append_sheet(wb, ws, "Planilha");

XLSX.writeFile(wb, outputPath, { cellStyles: true });
console.log("modelo.xlsx gerado em", outputPath);
