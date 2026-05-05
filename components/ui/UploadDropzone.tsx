"use client";

import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadDropzoneProps {
  accept?: string;
  hint?: string;
  onChange?: (file: File | null) => void;
}

export function UploadDropzone({
  accept = ".xlsx",
  hint = "ticker · quantidade · valor_declarado · data_base",
  onChange,
}: UploadDropzoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    onChange?.(f);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    onChange?.(null);
  };

  const containerBase: React.CSSProperties = {
    border: "2px dashed var(--border-color)",
    borderRadius: "var(--radius-lg)",
    backgroundColor: "var(--color-surface)",
    padding: "var(--spacing-12) var(--spacing-8)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--spacing-4)",
    boxShadow: "var(--shadow-sm)",
  };

  /* ── Estado: arquivo selecionado ── */
  if (file) {
    return (
      <div style={containerBase}>
        <CheckCircle2
          size={40}
          strokeWidth={1.5}
          color="var(--status-aprovado-text)"
          aria-hidden="true"
        />

        <p
          style={{
            fontSize: "var(--font-size-md)",
            fontWeight: "var(--font-weight-title)",
            color: "var(--color-text)",
            margin: 0,
            textAlign: "center",
          }}
        >
          {file.name}
        </p>

        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-muted)",
            margin: 0,
            fontFamily: "monospace",
          }}
        >
          {formatBytes(file.size)}
        </p>

        <button
          onClick={handleRemove}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
            textDecoration: "underline",
            fontFamily: "var(--font-family)",
            padding: 0,
          }}
        >
          Remover
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </div>
    );
  }

  /* ── Estado: aguardando arquivo ── */
  return (
    <div
      onClick={() => inputRef.current?.click()}
      style={{ ...containerBase, cursor: "pointer" }}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-secondary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>

      <p
        style={{
          fontSize: "var(--font-size-md)",
          fontWeight: "var(--font-weight-title)",
          color: "var(--color-text)",
          margin: 0,
          textAlign: "center",
        }}
      >
        Arraste o arquivo{" "}
        <span style={{ color: "var(--color-secondary)" }}>{accept}</span>{" "}
        aqui ou{" "}
        <span style={{ color: "var(--color-secondary)", textDecoration: "underline" }}>
          clique para selecionar
        </span>
      </p>

      <p
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-muted)",
          margin: 0,
          fontFamily: "monospace",
          backgroundColor: "var(--color-background)",
          padding: "var(--spacing-2) var(--spacing-4)",
          borderRadius: "var(--radius-sm)",
          border: "var(--border-width) solid var(--border-color)",
        }}
      >
        {hint}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
