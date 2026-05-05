import type { AuditRow } from "@/lib/audit/validator";

export type JobStatus = "pending" | "processing" | "done" | "error";

export interface AuditSummary {
  total: number;
  aprovado: number;
  alerta: number;
  erro: number;
}

export interface JobState {
  status: JobStatus;
  processed: number;
  total: number;
  rows?: AuditRow[];
  result?: Buffer;
  summary?: AuditSummary;
  error?: string;
}

const jobs = new Map<string, JobState>();
export default jobs;
