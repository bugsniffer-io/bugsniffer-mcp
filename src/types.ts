export type ScoreStatus = "queued" | "running" | "done" | "failed";

export interface Finding {
  check: string;
  severity: string;
  title: string;
  detail: string;
}

export interface ScoreJob {
  id: string;
  status: ScoreStatus;
  result_url: string;
}

export interface ScoreResult extends ScoreJob {
  score: number | null;
  verdict: string | null;
  platform: string | null;
  findings: Finding[];
  fix_prompt: string | null;
  error?: string | null;
}

export type ErrorCode =
  | "no_key"
  | "invalid_key"
  | "rate_limited"
  | "blocked"
  | "bad_url"
  | "not_found"
  | "failed"
  | "timeout"
  | "network"
  | "api";
