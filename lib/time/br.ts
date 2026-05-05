const TZ = "America/Sao_Paulo";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function partsInSaoPaulo(date: Date): { y: string; mo: string; d: string; h: string; mi: string; s: string } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    y: get("year"),
    mo: get("month"),
    d: get("day"),
    h: get("hour"),
    mi: get("minute"),
    s: get("second"),
  };
}

export function formatExecTimeBrt(date = new Date()): string {
  const p = partsInSaoPaulo(date);
  return `${p.d}/${p.mo}/${p.y} ${p.h}:${p.mi}:${p.s} UTC-3`;
}

export function formatFilenameTimestampBrt(date = new Date()): string {
  const p = partsInSaoPaulo(date);
  return `${p.y}${p.mo}${p.d}_${p.h}${p.mi}${p.s}`;
}

