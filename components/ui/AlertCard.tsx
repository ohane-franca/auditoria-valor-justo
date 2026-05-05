export type AlertVariant = "ATENÇÃO" | "VERIFICAR" | "ERRO";

const variantMap: Record<
  AlertVariant,
  { bg: string; text: string; accent: string; icon: string }
> = {
  "ATENÇÃO":   { bg: "var(--status-atencao-bg)",   text: "var(--status-atencao-text)",   accent: "var(--status-atencao-text)", icon: "⚠" },
  "VERIFICAR": { bg: "var(--status-verificar-bg)", text: "var(--status-verificar-text)", accent: "var(--status-verificar-text)", icon: "◎" },
  "ERRO":      { bg: "var(--status-erro-bg)",      text: "var(--status-erro-text)",      accent: "var(--status-erro-text)", icon: "✕" },
};

interface AlertCardProps {
  variant: AlertVariant;
  message: string;
  ticker?: string;
  date?: string;
}

export function AlertCard({ variant, message, ticker, date }: AlertCardProps) {
  const { bg, text, accent, icon } = variantMap[variant];
  return (
    <div
      style={{
        backgroundColor: bg,
        borderRadius: "var(--radius-md)",
        borderLeft: `4px solid ${accent}`,
        padding: "var(--spacing-4) var(--spacing-6)",
        display: "flex",
        gap: "var(--spacing-4)",
        alignItems: "flex-start",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Ícone */}
      <span
        style={{
          color: accent,
          fontSize: "var(--font-size-lg)",
          fontWeight: "var(--font-weight-title)",
          lineHeight: 1,
          flexShrink: 0,
          marginTop: "2px",
        }}
        aria-hidden="true"
      >
        {icon}
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-1)" }}>
        {/* Badge + meta */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-title)",
              color: text,
              letterSpacing: "0.05em",
            }}
          >
            {variant}
          </span>
          {ticker && (
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                fontFamily: "monospace",
                color: text,
                opacity: 0.75,
              }}
            >
              {ticker}
              {date ? ` · ${date}` : ""}
            </span>
          )}
        </div>

        {/* Mensagem */}
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: text,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
