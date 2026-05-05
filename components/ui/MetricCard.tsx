export type MetricVariant = "aprovado" | "alerta" | "erro" | "neutral";

const variantMap: Record<MetricVariant, { bg: string; countColor: string; borderAccent: string }> = {
  aprovado: {
    bg:           "var(--color-surface)",
    countColor:   "var(--status-aprovado-text)",
    borderAccent: "var(--status-aprovado-text)",
  },
  alerta: {
    bg:           "var(--color-surface)",
    countColor:   "var(--status-alerta-text)",
    borderAccent: "var(--status-alerta-text)",
  },
  erro: {
    bg:           "var(--color-surface)",
    countColor:   "var(--status-erro-text)",
    borderAccent: "var(--status-erro-text)",
  },
  neutral: {
    bg:           "var(--color-surface)",
    countColor:   "var(--color-primary)",
    borderAccent: "var(--color-secondary)",
  },
};

interface MetricCardProps {
  count: number;
  label: string;
  variant?: MetricVariant;
}

export function MetricCard({ count, label, variant = "neutral" }: MetricCardProps) {
  const { bg, countColor, borderAccent } = variantMap[variant];
  return (
    <div
      style={{
        backgroundColor: bg,
        border: "var(--border-width) solid var(--border-color)",
        borderTop: `3px solid ${borderAccent}`,
        borderRadius: "var(--radius-md)",
        padding: "var(--spacing-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-2)",
        boxShadow: "var(--shadow-sm)",
        minWidth: "120px",
      }}
    >
      <span
        style={{
          fontSize: "var(--font-size-2xl)",
          fontWeight: "var(--font-weight-title)",
          fontFamily: "monospace",
          color: countColor,
          lineHeight: 1,
        }}
      >
        {count}
      </span>
      <span
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-title)",
          color: "var(--color-text)",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}
