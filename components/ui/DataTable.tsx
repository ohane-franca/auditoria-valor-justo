import React from "react";
import { FileX } from "lucide-react";

export type Column = {
  key: string;
  label: string;
  numeric?: boolean;
  render?: (value: unknown) => React.ReactNode;
};

interface DataTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
}

export function DataTable({ columns, rows }: DataTableProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        border: "var(--border-width) solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--color-primary)" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "var(--spacing-3) var(--spacing-4)",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-title)",
                    fontFamily: "var(--font-family)",
                    color: "var(--color-surface)",
                    textAlign: col.numeric ? "right" : "left",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    borderBottom: "var(--border-width) solid var(--border-color)",
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={columns.length}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "var(--spacing-3)",
                      padding: "var(--spacing-12) var(--spacing-8)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <FileX size={36} strokeWidth={1.5} color="var(--color-text-muted)" aria-hidden="true" />
                    <p
                      style={{
                        fontSize: "var(--font-size-md)",
                        fontWeight: "var(--font-weight-title)",
                        margin: 0,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      Nenhum dado para exibir
                    </p>
                    <p
                      style={{
                        fontSize: "var(--font-size-sm)",
                        margin: 0,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      Faça o upload de uma planilha para iniciar
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  style={{
                    backgroundColor:
                      rowIdx % 2 === 0
                        ? "var(--color-surface)"
                        : "var(--color-background)",
                    borderBottom: "var(--border-width) solid var(--border-color)",
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: "var(--spacing-3) var(--spacing-4)",
                        fontSize: "var(--font-size-sm)",
                        fontFamily: col.numeric ? "monospace" : "var(--font-family)",
                        color: "var(--color-text)",
                        textAlign: col.numeric ? "right" : "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.render
                        ? col.render(row[col.key])
                        : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}
