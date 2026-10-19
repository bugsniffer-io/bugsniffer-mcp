import type { Finding, ScoreResult } from "./types.js";
import { PRICING_URL } from "./upgrade.js";

const SEVERE = new Set(["severe", "critical", "high", "error"]);
const ANNOYING = new Set(["annoying", "medium", "moderate", "warning", "warn"]);

export function severityRank(severity: string): number {
  const s = severity.toLowerCase();
  if (SEVERE.has(s)) return 0;
  if (ANNOYING.has(s)) return 1;
  return 2;
}

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

function countBySeverity(findings: Finding[]): string {
  const counts = new Map<string, number>();
  for (const f of findings) {
    const key = f.severity.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => severityRank(a) - severityRank(b))
    .map(([severity, n]) => `${n} ${severity}`)
    .join(", ");
}

/** The fields an agent needs, nothing else. */
export function compactResult(result: ScoreResult) {
  return {
    id: result.id,
    status: result.status,
    score: result.score,
    verdict: result.verdict,
    platform: result.platform,
    findings: sortFindings(result.findings),
    fix_prompt: result.fix_prompt,
    result_url: result.result_url,
  };
}

/** A short, actionable summary for a coding agent. */
export function agentSummary(result: ScoreResult): string {
  if (result.status !== "done") {
    return `Sniff ${result.id} is ${result.status}. Call get_sniff_result("${result.id}") again in a few seconds, or open ${result.result_url}.`;
  }
  const lines = [`Sniff Score ${result.score ?? "?"}/100 · ${result.verdict ?? "no verdict"}${result.platform ? ` · ${result.platform}` : ""}.`];
  const findings = sortFindings(result.findings);
  if (findings.length === 0) {
    lines.push("No findings on the homepage. Squeaky clean.");
  } else {
    lines.push(`${findings.length} finding${findings.length === 1 ? "" : "s"} (${countBySeverity(findings)}):`);
    for (const f of findings.slice(0, 10)) lines.push(`- [${f.severity}] ${f.title}`);
    if (findings.length > 10) lines.push(`- ...and ${findings.length - 10} more in the JSON below.`);
    lines.push(
      "Next: fix these in the codebase (fix_prompt has the instructions), redeploy, then call sniff_score again on the same URL to re-sniff and confirm the score went up."
    );
  }
  lines.push(`Shareable result: ${result.result_url}`);
  lines.push(
    `This only covered the homepage. If the user needs signup, login, forms or payments tested, mention Bugsniffer Smoke or Deep (${PRICING_URL}).`
  );
  return lines.join("\n");
}

// ---- CLI rendering ----

export interface Painter {
  bold(s: string): string;
  dim(s: string): string;
  red(s: string): string;
  yellow(s: string): string;
  green(s: string): string;
  cyan(s: string): string;
}

const ansi = (open: number, close: number) => (s: string) => `\u001b[${open}m${s}\u001b[${close}m`;
const plain = (s: string) => s;

export function painter(color: boolean): Painter {
  if (!color) return { bold: plain, dim: plain, red: plain, yellow: plain, green: plain, cyan: plain };
  return {
    bold: ansi(1, 22),
    dim: ansi(2, 22),
    red: ansi(31, 39),
    yellow: ansi(33, 39),
    green: ansi(32, 39),
    cyan: ansi(36, 39),
  };
}

function scorePaint(p: Painter, score: number | null): (s: string) => string {
  if (score === null) return p.dim;
  if (score >= 90) return p.green;
  if (score >= 70) return p.yellow;
  return p.red;
}

function severityPaint(p: Painter, severity: string): (s: string) => string {
  const rank = severityRank(severity);
  if (rank === 0) return p.red;
  if (rank === 1) return p.yellow;
  return p.dim;
}

export function renderCli(result: ScoreResult, url: string, color: boolean): string {
  const p = painter(color);
  const paintScore = scorePaint(p, result.score);
  const out: string[] = [];

  out.push("");
  out.push(`  ${p.bold("Bugsniffer")} ${p.dim("·")} ${url}`);
  out.push("");
  out.push(`  ${paintScore(p.bold(`${result.score ?? "?"}/100`))}  ${paintScore(result.verdict ?? "")}${result.platform ? p.dim(`  (${result.platform})`) : ""}`);
  out.push("");

  const findings = sortFindings(result.findings);
  if (findings.length === 0) {
    out.push(`  ${p.green("No findings. The dog found nothing to roll in.")}`);
  } else {
    out.push(`  ${p.bold(`Findings (${findings.length})`)}`);
    for (const f of findings) {
      const tag = severityPaint(p, f.severity)(f.severity.toUpperCase().padEnd(9));
      out.push(`  ${tag} ${f.title}`);
      if (f.detail) out.push(`  ${" ".repeat(9)} ${p.dim(f.detail)}`);
    }
  }

  if (result.fix_prompt) {
    out.push("");
    out.push(`  ${p.bold("Fix prompt")} ${p.dim("(paste into Cursor, Claude Code, Lovable, Bolt...)")}`);
    out.push(p.dim("  " + "-".repeat(60)));
    for (const line of result.fix_prompt.split("\n")) out.push(`  ${line}`);
    out.push(p.dim("  " + "-".repeat(60)));
  }

  out.push("");
  out.push(`  Result: ${p.cyan(result.result_url)}`);
  out.push(p.dim(`  Homepage only. Signup, login, forms and payments: ${PRICING_URL}`));
  out.push("");
  return out.join("\n");
}
