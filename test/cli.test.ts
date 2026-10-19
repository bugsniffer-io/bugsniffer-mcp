import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { parseArgs, run, type CliIO } from "../src/run.js";
import { VERSION } from "../src/version.js";
import { fakeClock, json, scriptedFetch } from "./helpers.js";

function io(fetchImpl: typeof fetch, opts: { tty?: boolean; env?: Record<string, string> } = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const clock = fakeClock();
  const value: CliIO = {
    stdout: { write: (s: string) => out.push(s), isTTY: opts.tty },
    stderr: { write: (s: string) => err.push(s), isTTY: opts.tty },
    env: { BUGSNIFFER_API_KEY: "test-key", ...opts.env },
    fetch: fetchImpl,
    sleep: clock.sleep,
    now: clock.now,
  };
  return { io: value, out: () => out.join(""), err: () => err.join("") };
}

const ESC = "\u001b[";

describe("parseArgs", () => {
  it("parses url, --json and --timeout", () => {
    expect(parseArgs(["my-app.com", "--json", "--timeout", "30"])).toMatchObject({ command: "score", url: "my-app.com", json: true, timeoutSec: 30 });
    expect(parseArgs(["--timeout=5", "x.com"])).toMatchObject({ timeoutSec: 5 });
  });
  it("recognises mcp, help and version", () => {
    expect(parseArgs(["mcp"])).toMatchObject({ command: "mcp" });
    expect(parseArgs([])).toMatchObject({ command: "help" });
    expect(parseArgs(["-v"])).toMatchObject({ command: "version" });
  });
  it("rejects unknown flags and extra URLs", () => {
    expect(parseArgs(["--nope"])).toEqual({ error: "Unknown option --nope" });
    expect(parseArgs(["a.com", "b.com"])).toHaveProperty("error");
    expect(parseArgs(["a.com", "--timeout", "soon"])).toHaveProperty("error");
  });
});

describe("cli", () => {
  it("prints a coloured score, findings and fix prompt on a TTY", async () => {
    const t = io(scriptedFetch([{ status: "running" }, {}]).fetch, { tty: true });
    expect(await run(["my-app.lovable.app"], t.io)).toBe(0);
    const out = t.out();
    expect(out).toContain(`${ESC}33m`); // yellow for 72
    expect(out).toContain("72/100");
    expect(out).toContain("A bit whiffy");
    expect(out).toContain("SEVERE");
    expect(out).toContain("3 console errors");
    expect(out).toContain("Fix prompt");
    expect(out).toContain("Fix these issues in my Lovable app:");
    expect(out).toContain("https://bugsniffer.io/score/abc123");
    expect(out.indexOf("SEVERE")).toBeLessThan(out.indexOf("COSMETIC"));
    expect(t.err()).toContain("Sniffing");
  });

  it("prints plain text when not a TTY or NO_COLOR is set", async () => {
    const t = io(scriptedFetch([{}]).fetch, { tty: true, env: { NO_COLOR: "1" } });
    await run(["my-app.com"], t.io);
    expect(t.out()).not.toContain(ESC);
    const p = io(scriptedFetch([{}]).fetch);
    await run(["my-app.com"], p.io);
    expect(p.out()).not.toContain(ESC);
    expect(p.err()).toBe("");
  });

  it("--json prints the compact result and nothing on stderr", async () => {
    const t = io(scriptedFetch([{}]).fetch, { tty: true });
    expect(await run(["my-app.com", "--json"], t.io)).toBe(0);
    const data = JSON.parse(t.out());
    expect(data).toMatchObject({ id: "abc123", status: "done", score: 72, verdict: "A bit whiffy" });
    expect(data.findings).toHaveLength(3);
    expect(t.err()).toBe("");
  });

  it("--json errors are JSON with exit 1", async () => {
    const { fetch } = scriptedFetch([{}], json({ error: "daily_limit", message: "Done for today." }, 429));
    const t = io(fetch);
    expect(await run(["my-app.com", "--json"], t.io)).toBe(1);
    expect(JSON.parse(t.out())).toMatchObject({ error: "rate_limited" });
  });

  it("missing key prints where to get one and exits 1", async () => {
    const t = io(scriptedFetch([{}]).fetch, { env: { BUGSNIFFER_API_KEY: "" } });
    expect(await run(["my-app.com"], t.io)).toBe(1);
    expect(t.err()).toContain("https://bugsniffer.io/score/api-key");
    expect(t.out()).toBe("");
  });

  it("timeout errors mention the id", async () => {
    const t = io(scriptedFetch([{ status: "running" }]).fetch);
    expect(await run(["my-app.com", "--timeout", "4"], t.io)).toBe(1);
    expect(t.err()).toContain("abc123");
  });

  it("bad usage exits 2 with help", async () => {
    const t = io(scriptedFetch([{}]).fetch);
    expect(await run(["--bogus"], t.io)).toBe(2);
    expect(t.err()).toContain("Usage");
  });

  it("mcp starts the server", async () => {
    const t = io(scriptedFetch([{}]).fetch);
    const startServer = vi.fn(async () => {});
    expect(await run(["mcp"], { ...t.io, startServer })).toBe(0);
    expect(startServer).toHaveBeenCalledOnce();
  });

  it("version matches package.json", async () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(VERSION).toBe(pkg.version);
  });
});
