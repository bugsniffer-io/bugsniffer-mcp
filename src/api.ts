import { VERSION } from "./version.js";
import type { ErrorCode, ScoreJob, ScoreResult } from "./types.js";

export const BASE_URL = "https://bugsniffer.io";
export const KEY_URL = "https://bugsniffer.io/score/api-key";
export const DAILY_LIMIT = 30;

export class BugsnifferError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status?: number,
    public readonly id?: string
  ) {
    super(message);
    this.name = "BugsnifferError";
  }
}

export interface ClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  client?: "mcp" | "cli";
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface WaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
  onStatus?: (result: ScoreResult) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Accepts "my-app.lovable.app" as well as full URLs; only http(s) is allowed. */
export function normaliseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new BugsnifferError("bad_url", "Give the dog a URL to sniff, like https://your-app.com.");
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new BugsnifferError("bad_url", `"${input}" isn't a URL the dog can follow. Try https://your-app.com.`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new BugsnifferError("bad_url", `Only http and https URLs can be sniffed, not ${parsed.protocol}`);
  }
  if (!parsed.hostname.includes(".")) {
    throw new BugsnifferError(
      "bad_url",
      `"${parsed.hostname}" isn't on the public internet. Deploy the app and sniff its public URL (localhost can't be reached from our side).`
    );
  }
  return parsed.toString();
}

export function noKeyMessage(): string {
  return [
    "No API key found. Set BUGSNIFFER_API_KEY.",
    `Get a free key (30 sniffs a day) at ${KEY_URL}. It's shown once, so copy it somewhere safe.`,
    "Then add it to your MCP config's env block, or run: export BUGSNIFFER_API_KEY=...",
  ].join("\n");
}

interface ApiErrorBody {
  error?: string;
  message?: string;
}

async function readErrorBody(response: Response): Promise<ApiErrorBody> {
  const text = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object") return parsed as ApiErrorBody;
  } catch {
    // not JSON, fall through
  }
  return { message: text.slice(0, 300) || undefined };
}

export function errorFromResponse(status: number, body: ApiErrorBody, id?: string): BugsnifferError {
  const serverMessage = body.message?.trim();
  const code = body.error;

  if (status === 401 || code === "invalid_key" || code === "unauthorized") {
    return new BugsnifferError(
      "invalid_key",
      `Bugsniffer didn't recognise that API key. Check BUGSNIFFER_API_KEY, or get a fresh free key at ${KEY_URL}.`,
      status
    );
  }
  if (status === 429) {
    const limitHit = code === "daily_limit" || code === "rate_limited" || code === undefined;
    const advice = limitHit
      ? `Free keys get ${DAILY_LIMIT} sniffs a day, and this one has had them. The dog needs a lie down; try again tomorrow. Need more than a homepage check? See https://bugsniffer.io/#pricing.`
      : "Easy, tiger. Too many requests at once; wait a minute and retry.";
    return new BugsnifferError("rate_limited", serverMessage ? `${serverMessage}\n${advice}` : advice, status);
  }
  if (status === 403 && (code === "blocked" || code === "blocked_domain")) {
    return new BugsnifferError(
      "blocked",
      `${serverMessage ?? "That domain is off the menu."}\nThe free score only sniffs apps you own. Point it at your own deployed app.`,
      status
    );
  }
  if (status === 403) {
    return new BugsnifferError(
      "invalid_key",
      serverMessage ?? `Bugsniffer refused this key. Get a fresh free key at ${KEY_URL}.`,
      status
    );
  }
  if (status === 400 || status === 422) {
    return new BugsnifferError("bad_url", serverMessage ?? "Bugsniffer couldn't use that URL.", status);
  }
  if (status === 404) {
    return new BugsnifferError(
      "not_found",
      id ? `No sniff with id "${id}". Ids come from sniff_score; scores may expire.` : serverMessage ?? "Not found.",
      status,
      id
    );
  }
  return new BugsnifferError(
    "api",
    `Bugsniffer API error ${status}${serverMessage ? `: ${serverMessage}` : ""}. If it keeps happening, email support@bugsniffer.io.`,
    status,
    id
  );
}

export class BugsnifferClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly userAgent: string;

  constructor(options: ClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.BUGSNIFFER_API_KEY;
    this.baseUrl = (options.baseUrl ?? BASE_URL).replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.sleep = options.sleep ?? defaultSleep;
    this.now = options.now ?? Date.now;
    this.userAgent = `bugsniffer/${VERSION} (${options.client ?? "mcp"}; node ${process.versions.node})`;
  }

  private key(): string {
    const key = this.apiKey?.trim();
    if (!key) throw new BugsnifferError("no_key", noKeyMessage());
    return key;
  }

  private async request<T>(path: string, init: RequestInit, id?: string): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.key()}`,
      Accept: "application/json",
      "User-Agent": this.userAgent,
    };
    if (init.body) headers["Content-Type"] = "application/json";

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, headers });
    } catch (error) {
      throw new BugsnifferError(
        "network",
        `Couldn't reach bugsniffer.io (${(error as Error).message}). Check your connection and try again.`
      );
    }

    if (!response.ok) {
      throw errorFromResponse(response.status, await readErrorBody(response), id);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new BugsnifferError("api", "Bugsniffer sent back something that wasn't JSON. Try again in a minute.", response.status);
    }
  }

  /** Starts a Sniff Score. Returns immediately with the job id. */
  async startScore(url: string): Promise<ScoreJob> {
    const target = normaliseUrl(url);
    return this.request<ScoreJob>("/api/v1/score", { method: "POST", body: JSON.stringify({ url: target }) });
  }

  /** Fetches the current state of a score. */
  async getScore(id: string): Promise<ScoreResult> {
    const clean = id.trim();
    if (!clean) throw new BugsnifferError("not_found", "A sniff id is required.");
    const result = await this.request<ScoreResult>(`/api/v1/score/${encodeURIComponent(clean)}`, { method: "GET" }, clean);
    return { ...result, findings: Array.isArray(result.findings) ? result.findings : [] };
  }

  /** Polls a score until it is done or failed, or the timeout passes. */
  async waitForScore(id: string, options: WaitOptions = {}): Promise<ScoreResult> {
    const timeoutMs = options.timeoutMs ?? 60_000;
    const intervalMs = options.intervalMs ?? 2_000;
    const deadline = this.now() + timeoutMs;

    for (;;) {
      const result = await this.getScore(id);
      options.onStatus?.(result);
      if (result.status === "done") return result;
      if (result.status === "failed") {
        throw new BugsnifferError(
          "failed",
          `The sniff failed${result.error ? `: ${result.error}` : ""}. Usually the homepage didn't load (down, private, or behind a login). Check it loads in a normal browser, then try again.`,
          undefined,
          id
        );
      }
      const remaining = deadline - this.now();
      if (remaining <= 0) {
        throw new BugsnifferError(
          "timeout",
          `Still sniffing after ${Math.round(timeoutMs / 1000)} s (status: ${result.status}). Check back with get_sniff_result("${id}") or open ${result.result_url}.`,
          undefined,
          id
        );
      }
      await this.sleep(Math.min(intervalMs, remaining));
    }
  }

  /** Starts a score and waits for it. */
  async sniff(url: string, options: WaitOptions = {}): Promise<ScoreResult> {
    const job = await this.startScore(url);
    return this.waitForScore(job.id, options);
  }
}
