import { vi } from "vitest";
import type { ScoreResult } from "../src/types.js";

export const DONE: ScoreResult = {
  id: "abc123",
  status: "done",
  score: 72,
  verdict: "A bit whiffy",
  platform: "lovable",
  findings: [
    { check: "links", severity: "cosmetic", title: "1 broken link", detail: "/old-blog returns 404" },
    { check: "console", severity: "severe", title: "3 console errors", detail: "TypeError: Cannot read properties of undefined (reading 'map')" },
    { check: "speed", severity: "annoying", title: "Slow first paint", detail: "LCP 4.1 s on mobile" },
  ],
  fix_prompt: "Fix these issues in my Lovable app:\n1. ...",
  result_url: "https://bugsniffer.io/score/abc123",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

type Route = (url: string, init: RequestInit) => Response | Promise<Response>;

/** A fetch stub: POST returns a job, then each GET returns the next status in the sequence. */
export function scriptedFetch(gets: Array<Partial<ScoreResult> | Response>, post?: Response) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let i = 0;
  const route: Route = (url, init) => {
    if (init.method === "POST") return post ?? json({ id: "abc123", status: "queued", result_url: DONE.result_url }, 202);
    const next = gets[Math.min(i++, gets.length - 1)];
    if (next instanceof Response) return next.clone();
    return json({ ...DONE, ...next });
  };
  const fn = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return route(url, init);
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

/** Fake clock: sleep advances time instantly. */
export function fakeClock() {
  let t = 0;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
    elapsed: () => t,
  };
}
