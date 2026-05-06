#!/usr/bin/env node
/**
 * Diagnóstico sem UI/SSE: POST upload + polling GET /api/audit/status/[jobId].
 * Uso: node scripts/diagnostic-audit-flow.mjs <arquivo.xlsx> [baseUrl]
 * Ex.: node scripts/diagnostic-audit-flow.mjs ./public/modelo.xlsx http://localhost:3000
 */

import fs from "node:fs";
import path from "node:path";

const fileArg = process.argv[2];
const baseUrl = (process.argv[3] ?? "http://localhost:3000").replace(/\/$/, "");

if (!fileArg) {
  console.error("Uso: node scripts/diagnostic-audit-flow.mjs <arquivo.xlsx> [baseUrl]");
  process.exit(1);
}

const abs = path.resolve(fileArg);
if (!fs.existsSync(abs)) {
  console.error("Arquivo não encontrado:", abs);
  process.exit(1);
}

const buf = fs.readFileSync(abs);
const name = path.basename(abs);
const form = new FormData();
form.append("file", new Blob([new Uint8Array(buf)]), name);

const startUrl = `${baseUrl}/api/audit/start`;
console.log("[diagnostic] POST", startUrl);
let startRes;
try {
  startRes = await fetch(startUrl, { method: "POST", body: form });
} catch (e) {
  console.error("[diagnostic] fetch start falhou:", e instanceof Error ? e.message : e);
  process.exit(1);
}

const startText = await startRes.text();
console.log("[diagnostic] start HTTP", startRes.status, startText.slice(0, 600));

if (!startRes.ok) {
  process.exit(1);
}

let body;
try {
  body = JSON.parse(startText);
} catch {
  console.error("[diagnostic] resposta start não é JSON");
  process.exit(1);
}

const { jobId, total } = body;
console.log("[diagnostic] jobId", jobId, "total", total);

const maxTicks = 600;
for (let i = 0; i < maxTicks; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const statusUrl = `${baseUrl}/api/audit/status/${jobId}`;
  let s;
  try {
    s = await fetch(statusUrl, { cache: "no-store" });
  } catch (e) {
    console.log(`[diagnostic] [${i + 1}] GET status erro rede`, e instanceof Error ? e.message : e);
    continue;
  }
  const txt = await s.text();
  console.log(`[diagnostic] [${i + 1}] GET status HTTP ${s.status}`, txt.slice(0, 400));
  if (s.status === 404) {
    console.warn(
      "[diagnostic] 404 — job não existe nesta instância (típico com várias réplicas ou servidor reiniciado)."
    );
    continue;
  }
  if (!s.ok) continue;
  let j;
  try {
    j = JSON.parse(txt);
  } catch {
    continue;
  }
  if (j.status === "done" && j.summary) {
    console.log("[diagnostic] concluído OK:", JSON.stringify(j.summary));
    process.exit(0);
  }
  if (j.status === "error") {
    console.error("[diagnostic] job erro:", j.error ?? "?");
    process.exit(1);
  }
}

console.error("[diagnostic] timeout aguardando conclusão (600 s)");
process.exit(2);
