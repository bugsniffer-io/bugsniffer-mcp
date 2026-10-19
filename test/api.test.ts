import { describe, expect, it } from "vitest";
import { BugsnifferClient, BugsnifferError, normaliseUrl } from "../src/api.js";
import { DONE, fakeClock, json, scriptedFetch } from "./helpers.js";

function client(fetchImpl: typeof fetch, clock = fakeClock(), apiKey: string | undefined = "test-key") {
  return new BugsnifferClient({ apiKey, fetch: fetchImpl, sleep: clock.sleep, now: clock.now });
}

async function caught(p: Promise<unknown>): Promise<BugsnifferError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(BugsnifferError);
    return e as BugsnifferError;
  }
  throw new Error("expected an error");
}

describe("normaliseUrl", () => {
  it("adds https to bare domains", () => {
    expect(normaliseUrl("my-app.lovable.app")).toBe("https://my-app.lovable.app/");
  });
  it("rejects non-http schemes", () => {
    expect(() => normaliseUrl("ftp://x.com")).toThrow(/http and https/);
  });
  it("rejects localhost with a hint to deploy", () => {
    expect(() => normaliseUrl("http://localhost:3000")).toThrow(/Deploy the app/);
  });
  it("rejects empty input", () => {
    expect(() => normaliseUrl("  ")).toThrow(/URL/);
  });
});

describe("BugsnifferClient", () => {
  it("POSTs the URL with a bearer key, then polls until done", async () => {
    const clock = fakeClock();
    const { fetch, calls } = scriptedFetch([{ status: "queued" }, { status: "running" }, {}]);
    const result = await client(fetch, clock).sniff("https://my-app.lovable.app");

    expect(result.score).toBe(72);
    expect(calls[0].url).toBe("https://bugsniffer.io/api/v1/score");
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ url: "https://my-app.lovable.app/" });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(calls.slice(1).map((c) => c.url)).toEqual(Array(3).fill("https://bugsniffer.io/api/v1/score/abc123"));
    expect(clock.elapsed()).toBe(4000);
  });

  it("times out after 60 s with the id so the agent can check back", async () => {
    const clock = fakeClock();
    const { fetch, calls } = scriptedFetch([{ status: "running" }]);
    const err = await caught(client(fetch, clock).sniff("https://my-app.com"));
    expect(err.code).toBe("timeout");
    expect(err.id).toBe("abc123");
    expect(err.message).toContain('get_sniff_result("abc123")');
    expect(clock.elapsed()).toBe(60_000);
    expect(calls.length).toBe(1 + 31); // POST + polls at 0, 2, ..., 60 s
  });

  it("never sleeps past the deadline", async () => {
    const clock = fakeClock();
    const { fetch } = scriptedFetch([{ status: "running" }]);
    await caught(client(fetch, clock).waitForScore("abc123", { timeoutMs: 5000, intervalMs: 2000 }));
    expect(clock.elapsed()).toBe(5000);
  });

  it("reports a failed sniff with the server's reason", async () => {
    const { fetch } = scriptedFetch([{ status: "running" }, { status: "failed", error: "net::ERR_NAME_NOT_RESOLVED" }]);
    const err = await caught(client(fetch).sniff("https://nope.example"));
    expect(err.code).toBe("failed");
    expect(err.message).toContain("ERR_NAME_NOT_RESOLVED");
  });

  it("explains where to get a key when none is set, without calling the API", async () => {
    const { fetch, calls } = scriptedFetch([{}]);
    const err = await caught(client(fetch, fakeClock(), "").sniff("https://my-app.com"));
    expect(err.code).toBe("no_key");
    expect(err.message).toContain("https://bugsniffer.io/score/api-key");
    expect(err.message).toContain("BUGSNIFFER_API_KEY");
    expect(calls).toHaveLength(0);
  });

  it("maps 401 to invalid_key", async () => {
    const { fetch } = scriptedFetch([{}], json({ error: "invalid_key", message: "Nope" }, 401));
    const err = await caught(client(fetch).sniff("https://my-app.com"));
    expect(err.code).toBe("invalid_key");
    expect(err.message).toContain("score/api-key");
  });

  it("maps 429 daily_limit to rate_limited with the 30-a-day limit", async () => {
    const { fetch } = scriptedFetch([{}], json({ error: "daily_limit", message: "That's 30 sniffs today." }, 429));
    const err = await caught(client(fetch).sniff("https://my-app.com"));
    expect(err.code).toBe("rate_limited");
    expect(err.message).toContain("30 sniffs a day");
    expect(err.message).toContain("That's 30 sniffs today.");
  });

  it("maps 429 slow_down to a short wait message", async () => {
    const { fetch } = scriptedFetch([{}], json({ error: "slow_down", message: "Easy, tiger." }, 429));
    const err = await caught(client(fetch).sniff("https://my-app.com"));
    expect(err.code).toBe("rate_limited");
    expect(err.message).toContain("wait a minute");
  });

  it("maps 403 blocked to blocked with the server's reason", async () => {
    const reason = "Sorry, that one's not ours to sniff. Big-brand sites are off the menu.";
    const { fetch } = scriptedFetch([{}], json({ error: "blocked", message: reason }, 403));
    const err = await caught(client(fetch).sniff("https://google.com"));
    expect(err.code).toBe("blocked");
    expect(err.message).toContain(reason);
    expect(err.message).toContain("apps you own");
  });

  it("maps 404 on get to not_found", async () => {
    const { fetch } = scriptedFetch([json({ error: "not_found" }, 404)]);
    const err = await caught(client(fetch).getScore("missing"));
    expect(err.code).toBe("not_found");
    expect(err.message).toContain("missing");
  });

  it("maps 5xx with a non-JSON body to api", async () => {
    const { fetch } = scriptedFetch([new Response("<html>Bad gateway</html>", { status: 502 })]);
    const err = await caught(client(fetch).getScore("abc123"));
    expect(err.code).toBe("api");
    expect(err.message).toContain("502");
  });

  it("wraps network failures", async () => {
    const fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof globalThis.fetch;
    const err = await caught(client(fetch).getScore("abc123"));
    expect(err.code).toBe("network");
  });

  it("defaults missing findings to an empty list", async () => {
    const { fetch } = scriptedFetch([json({ ...DONE, findings: undefined })]);
    const result = await client(fetch).getScore("abc123");
    expect(result.findings).toEqual([]);
  });
});
