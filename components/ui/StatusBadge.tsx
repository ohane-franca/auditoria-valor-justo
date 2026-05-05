export type Status = "APROVADO" | "ALERTA" | "VERIFICAR" | "ATENÇÃO" | "ERRO";

const tokenMap: Record<Status, { bg: string; text: string }> = {
  "APROVADO":  { bg: "var(--status-aprovado-bg)",  text: "var(--status-aprovado-text)"  },
  "ALERTA":    { bg: "var(--status-alerta-bg)",    text: "var(--status-alerta-text)"    },
  "VERIFICAR": { bg: "var(--status-verificar-bg)", text: "var(--status-verificar-text)" },
  "ATENÇÃO":   { bg: "var(--status-atencao-bg)",   text: "var(--status-atencao-text)"   },
  "ERRO":      { bg: "var(--status-erro-bg)",      text: "var(--status-erro-text)"      },
};

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { bg, text } = tokenMap[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: bg,
        color: text,
        fontSize: "var(--font-size-xs)",
        fontWeight: "var(--font-weight-title)",
        fontFamily: "var(--font-family)",
        padding: "3px var(--spacing-3)",
        borderRadius: "var(--radius-pill)",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}
