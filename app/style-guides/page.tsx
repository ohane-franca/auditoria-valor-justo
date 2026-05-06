"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { UploadDropzone } from "@/components/ui/UploadDropzone";
import { AlertCard } from "@/components/ui/AlertCard";
import { MetricCard } from "@/components/ui/MetricCard";

// ── Dados de demonstração ──────────────────────────────────────────────────

const tableColumns: Column[] = [
  { key: "ticker",           label: "Ticker"           },
  { key: "quantidade",       label: "Qtd",    numeric: true },
  { key: "close_USDT_BRT",   label: "Binance (USDT)", numeric: true },
  { key: "ptax",             label: "PTAX",           numeric: true },
  { key: "valor_justo",      label: "V. Justo (BRL)", numeric: true },
  { key: "diferenca",        label: "Dif. %",         numeric: true },
  {
    key: "status",
    label: "Status",
    render: (v) => <StatusBadge status={v as "APROVADO" | "ALERTA"} />,
  },
];

const tableRows = [
  {
    ticker: "BTC", quantidade: "2,5000", close_USDT_BRT: "96.400,00",
    ptax: "6,1803",
    valor_justo: "595.585,20", diferenca: "49,60%", status: "ALERTA",
  },
  {
    ticker: "ETH", quantidade: "10,0000", close_USDT_BRT: "3.380,00",
    ptax: "6,1803",
    valor_justo: "20.889,41", diferenca: "0,80%", status: "APROVADO",
  },
  {
    ticker: "XRP", quantidade: "10.000", close_USDT_BRT: "N/D",
    ptax: "6,1803",
    valor_justo: "13.596,66", diferenca: "59,50%", status: "ALERTA",
  },
];

// ──────────────────────────────────────────────────────────────────────────

const colors = [
  { name: "Primária",    token: "--color-primary",    hex: "#1B2A4A", light: true  },
  { name: "Secundária",  token: "--color-secondary",  hex: "#2D6DB4", light: true  },
  { name: "Fundo",       token: "--color-background", hex: "#F8F9FA", light: false },
  { name: "Superfície",  token: "--color-surface",    hex: "#FFFFFF", light: false },
  { name: "Texto",       token: "--color-text",       hex: "#1A1A2E", light: true  },
  { name: "Texto Muted", token: "--color-text-muted", hex: "#6C757D", light: true  },
];

const statuses = [
  { label: "APROVADO",  bg: "var(--status-aprovado-bg)",  text: "var(--status-aprovado-text)"  },
  { label: "ALERTA",    bg: "var(--status-alerta-bg)",    text: "var(--status-alerta-text)"    },
  { label: "VERIFICAR", bg: "var(--status-verificar-bg)", text: "var(--status-verificar-text)" },
  { label: "ATENÇÃO",   bg: "var(--status-atencao-bg)",   text: "var(--status-atencao-text)"   },
  { label: "ERRO",      bg: "var(--status-erro-bg)",      text: "var(--status-erro-text)"      },
];

const typeSizes = [
  { label: "2xl — 32px", size: "var(--font-size-2xl)", weight: "var(--font-weight-title)" },
  { label: "xl — 24px",  size: "var(--font-size-xl)",  weight: "var(--font-weight-title)" },
  { label: "lg — 20px",  size: "var(--font-size-lg)",  weight: "var(--font-weight-title)" },
  { label: "md — 16px",  size: "var(--font-size-md)",  weight: "var(--font-weight-body)"  },
  { label: "sm — 14px",  size: "var(--font-size-sm)",  weight: "var(--font-weight-body)"  },
  { label: "xs — 12px",  size: "var(--font-size-xs)",  weight: "var(--font-weight-body)"  },
];

const spacings = [
  { label: "spacing-1",  value: "4px",  px: 4  },
  { label: "spacing-2",  value: "8px",  px: 8  },
  { label: "spacing-3",  value: "12px", px: 12 },
  { label: "spacing-4",  value: "16px", px: 16 },
  { label: "spacing-6",  value: "24px", px: 24 },
  { label: "spacing-8",  value: "32px", px: 32 },
  { label: "spacing-12", value: "48px", px: 48 },
  { label: "spacing-16", value: "64px", px: 64 },
];

const radii = [
  { label: "sm",   value: "var(--radius-sm)",   px: "4px"    },
  { label: "md",   value: "var(--radius-md)",   px: "8px"    },
  { label: "lg",   value: "var(--radius-lg)",   px: "12px"   },
  { label: "pill", value: "var(--radius-pill)", px: "9999px" },
];

const shadows = [
  { label: "shadow-sm", value: "var(--shadow-sm)" },
  { label: "shadow-md", value: "var(--shadow-md)" },
  { label: "shadow-lg", value: "var(--shadow-lg)" },
];

const btnBase: React.CSSProperties = {
  fontSize: "var(--font-size-sm)",
  fontWeight: "var(--font-weight-title)",
  fontFamily: "var(--font-family)",
  padding: "10px var(--spacing-6)",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  letterSpacing: "0.01em",
  transition: "background-color 0.15s ease, color 0.15s ease",
};

const s = {
  page: {
    backgroundColor: "var(--color-background)",
    color: "var(--color-text)",
    fontFamily: "var(--font-family)",
    minHeight: "100vh",
    padding: "var(--spacing-12) var(--spacing-6)",
  } as React.CSSProperties,

  inner: {
    maxWidth: "960px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--spacing-12)",
  } as React.CSSProperties,

  header: {
    borderBottom: "var(--border-width) solid var(--border-color)",
    paddingBottom: "var(--spacing-6)",
  } as React.CSSProperties,

  headerTitle: {
    fontSize: "var(--font-size-2xl)",
    fontWeight: "var(--font-weight-title)",
    color: "var(--color-primary)",
    margin: 0,
  } as React.CSSProperties,

  headerSub: {
    fontSize: "var(--font-size-sm)",
    color: "var(--color-text-muted)",
    marginTop: "var(--spacing-1)",
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: "var(--font-size-lg)",
    fontWeight: "var(--font-weight-title)",
    color: "var(--color-primary)",
    marginBottom: "var(--spacing-4)",
    paddingBottom: "var(--spacing-2)",
    borderBottom: "var(--border-width) solid var(--border-color)",
  } as React.CSSProperties,

  grid: (cols: number) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gap: "var(--spacing-4)",
  } as React.CSSProperties),

  card: {
    backgroundColor: "var(--color-surface)",
    border: "var(--border-width) solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "var(--spacing-4)",
  } as React.CSSProperties,

  label: {
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-muted)",
    marginTop: "var(--spacing-2)",
  } as React.CSSProperties,

  mono: {
    fontFamily: "monospace",
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-muted)",
  } as React.CSSProperties,
};

export default function StyleGuide() {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  return (
    <div style={s.page}>
      <div style={s.inner}>

        {/* Cabeçalho */}
        <header style={s.header}>
          <h1 style={s.headerTitle}>CLA Brasil — Design Tokens</h1>
          <p style={s.headerSub}>
            Referência visual de tokens de design · Auditoria de Valor Justo de Ativos Digitais
          </p>
        </header>

        {/* Paleta de Cores */}
        <section>
          <h2 style={s.sectionTitle}>Paleta de Cores</h2>
          <div style={s.grid(6)}>
            {colors.map((c) => (
              <div key={c.token} style={s.card}>
                <div
                  style={{
                    backgroundColor: c.hex,
                    borderRadius: "var(--radius-sm)",
                    height: "80px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ color: c.light ? "#fff" : "#1A1A2E", fontSize: "var(--font-size-xs)", fontFamily: "monospace" }}>
                    {c.hex}
                  </span>
                </div>
                <p style={{ ...s.label, fontWeight: 600, color: "var(--color-text)", marginTop: "var(--spacing-3)" }}>
                  {c.name}
                </p>
                <p style={s.mono}>{c.token}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Estados de Status */}
        <section>
          <h2 style={s.sectionTitle}>Estados de Status</h2>
          <div style={s.grid(5)}>
            {statuses.map((st) => (
              <div
                key={st.label + "-card"}
                style={{
                  backgroundColor: st.bg,
                  border: "var(--border-width) solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--spacing-4)",
                }}
              >
                <p style={{ color: st.text, fontWeight: 600, fontSize: "var(--font-size-sm)", margin: 0 }}>
                  {st.label}
                </p>
                <p style={{ ...s.mono, marginTop: "var(--spacing-2)" }}>bg · text</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tipografia */}
        <section>
          <h2 style={s.sectionTitle}>Escala Tipográfica — Inter</h2>
          <div
            style={{
              backgroundColor: "var(--color-surface)",
              border: "var(--border-width) solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            {typeSizes.map((t, i) => (
              <div
                key={t.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-6)",
                  padding: "var(--spacing-4) var(--spacing-6)",
                  borderBottom: i < typeSizes.length - 1 ? "var(--border-width) solid var(--border-color)" : "none",
                }}
              >
                <span style={{ ...s.mono, width: "96px", flexShrink: 0 }}>{t.label}</span>
                <span style={{ fontSize: t.size, fontWeight: t.weight, color: "var(--color-text)", lineHeight: 1.2 }}>
                  Valor Justo
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Espaçamento */}
        <section>
          <h2 style={s.sectionTitle}>Escala de Espaçamento</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-3)" }}>
            {spacings.map((sp) => (
              <div key={sp.label} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)" }}>
                <span style={{ ...s.mono, width: "96px", flexShrink: 0 }}>{sp.label}</span>
                <span style={{ ...s.mono, width: "40px", flexShrink: 0 }}>{sp.value}</span>
                <div
                  style={{
                    height: "24px",
                    width: `${sp.px * 2}px`,
                    backgroundColor: "var(--color-secondary)",
                    borderRadius: "var(--radius-sm)",
                    opacity: 0.7,
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Bordas */}
        <section>
          <h2 style={s.sectionTitle}>Bordas</h2>
          <div style={s.grid(4)}>
            {radii.map((r) => (
              <div key={r.label} style={s.card}>
                <div
                  style={{
                    height: "64px",
                    backgroundColor: "var(--color-background)",
                    border: "2px solid var(--color-secondary)",
                    borderRadius: r.value,
                  }}
                />
                <p style={{ ...s.label, fontWeight: 600, color: "var(--color-text)", marginTop: "var(--spacing-3)" }}>
                  radius-{r.label}
                </p>
                <p style={s.mono}>{r.px}</p>
              </div>
            ))}
          </div>
          <div
            style={{
              ...s.card,
              marginTop: "var(--spacing-4)",
              display: "flex",
              gap: "var(--spacing-6)",
              alignItems: "center",
            }}
          >
            <span style={s.mono}>border-width: 1px</span>
            <div style={{ height: "24px", width: "120px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }} />
            <span style={s.mono}>border-color: #DEE2E6</span>
          </div>
        </section>

        {/* Sombras */}
        <section>
          <h2 style={s.sectionTitle}>Sombras</h2>
          <div style={s.grid(3)}>
            {shadows.map((sh) => (
              <div
                key={sh.label}
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--spacing-8)",
                  boxShadow: sh.value,
                  textAlign: "center" as const,
                }}
              >
                <p style={{ fontWeight: 600, fontSize: "var(--font-size-sm)", margin: 0 }}>{sh.label}</p>
                <p style={{ ...s.mono, marginTop: "var(--spacing-2)" }}>
                  var({sh.value.replace("var(", "").replace(")", "")})
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Botões */}
        <section>
          <h2 style={s.sectionTitle}>Botões</h2>
          <div style={{ ...s.card, display: "flex", flexWrap: "wrap" as const, gap: "var(--spacing-4)", alignItems: "center" }}>

            {/* Primário */}
            <button
              onMouseEnter={() => setHoveredBtn("primary")}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                ...btnBase,
                backgroundColor: hoveredBtn === "primary" ? "#182643" : "var(--color-primary)",
                color: "#FFFFFF",
                border: "none",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              Botão Primário
            </button>

            {/* Secundário */}
            <button
              onMouseEnter={() => setHoveredBtn("secondary")}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                ...btnBase,
                backgroundColor: hoveredBtn === "secondary" ? "var(--color-primary)" : "var(--color-surface)",
                color: hoveredBtn === "secondary" ? "#FFFFFF" : "var(--color-primary)",
                border: "var(--border-width) solid var(--color-primary)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              Botão Secundário
            </button>

            {/* Confirmar */}
            <button
              onMouseEnter={() => setHoveredBtn("confirmar")}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                ...btnBase,
                backgroundColor: hoveredBtn === "confirmar" ? "var(--color-primary)" : "transparent",
                color: hoveredBtn === "confirmar" ? "#FFFFFF" : "var(--color-primary)",
                border: "var(--border-width) solid var(--color-primary)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              Confirmar
            </button>

            {/* Cancelar */}
            <button
              onMouseEnter={() => setHoveredBtn("cancelar")}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                ...btnBase,
                backgroundColor: hoveredBtn === "cancelar" ? "var(--color-background)" : "transparent",
                color: "var(--color-text-muted)",
                border: "var(--border-width) solid var(--border-color)",
                fontWeight: "var(--font-weight-body)",
              }}
            >
              Cancelar
            </button>

          </div>
        </section>

        {/* ── Componente: StatusBadge ── */}
        <section>
          <h2 style={s.sectionTitle}>Componente — StatusBadge</h2>
          <div style={{ ...s.card, display: "flex", flexWrap: "wrap" as const, gap: "var(--spacing-3)", alignItems: "center" }}>
            <StatusBadge status="APROVADO"  />
            <StatusBadge status="ALERTA"    />
            <StatusBadge status="VERIFICAR" />
            <StatusBadge status="ATENÇÃO"   />
            <StatusBadge status="ERRO"      />
          </div>
        </section>

        {/* ── Componente: DataTable — com dados ── */}
        <section>
          <h2 style={s.sectionTitle}>Componente — DataTable (com dados)</h2>
          <DataTable columns={tableColumns} rows={tableRows} />
        </section>

        {/* ── Componente: DataTable — estado vazio ── */}
        <section>
          <h2 style={s.sectionTitle}>Componente — DataTable (estado vazio)</h2>
          <DataTable columns={tableColumns} rows={[]} />
        </section>

        {/* ── Componente: UploadDropzone ── */}
        <section>
          <h2 style={s.sectionTitle}>Componente — UploadDropzone</h2>
          <UploadDropzone />
        </section>

        {/* ── Componente: AlertCard ── */}
        <section>
          <h2 style={s.sectionTitle}>Componente — AlertCard</h2>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "var(--spacing-3)" }}>
            <AlertCard
              variant="VERIFICAR"
              ticker="BTC"
              date="2024-12-31"
              message="VERIFICAR — diferença acima de 1,5%"
            />
            <AlertCard
              variant="ATENÇÃO"
              ticker="XRP"
              date="2024-12-31"
              message="ATENÇÃO — fonte única, revisão obrigatória"
            />
            <AlertCard
              variant="ATENÇÃO"
              ticker="SOL"
              date="2024-12-29"
              message="ATENÇÃO — revisão recomendada"
            />
            <AlertCard
              variant="ERRO"
              ticker="XYZ"
              date="2024-12-31"
              message="ERRO — ativo não localizado nas fontes consultadas"
            />
          </div>
        </section>

        {/* ── Componente: MetricCard ── */}
        <section>
          <h2 style={s.sectionTitle}>Componente — MetricCard</h2>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "var(--spacing-4)" }}>
            <MetricCard count={12} label="Total"    variant="neutral"  />
            <MetricCard count={9}  label="Aprovado" variant="aprovado" />
            <MetricCard count={3}  label="Alerta"   variant="alerta"   />
            <MetricCard count={1}  label="Erro"     variant="erro"     />
          </div>
        </section>

        {/* Rodapé */}
        <footer
          style={{
            borderTop: "var(--border-width) solid var(--border-color)",
            paddingTop: "var(--spacing-6)",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
          }}
        >
          CLA Brasil · Auditoria de Valor Justo de Ativos Digitais · v1.0.0
        </footer>

      </div>
    </div>
  );
}
