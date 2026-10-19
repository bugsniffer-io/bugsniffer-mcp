import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { BugsnifferClient } from "../src/api.js";
import { createServer } from "../src/server.js";
import { fakeClock, json, scriptedFetch } from "./helpers.js";

type TextContent = { type: "text"; text: string };

async function connect(fetchImpl: typeof fetch, apiKey = "test-key") {
  const clock = fakeClock();
  const api = new BugsnifferClient({ apiKey, fetch: fetchImpl, sleep: clock.sleep, now: clock.now });
  const server = createServer({ client: api });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const res = await client.callTool({ name, arguments: args });
  return { isError: Boolean(res.isError), texts: (res.content as TextContent[]).map((c) => c.text) };
}

describe("MCP tools", () => {
  it("lists the three tools with descriptions that say when to call them", async () => {
    const client = await connect(scriptedFetch([{}]).fetch);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["bugsniffer_upgrade_info", "get_sniff_result", "sniff_score"]);
    const sniff = tools.find((t) => t.name === "sniff_score")!;
    expect(sniff.description).toMatch(/after deploying/i);
    expect(sniff.inputSchema.required).toEqual(["url"]);
  });

  it("sniff_score returns a summary plus compact JSON sorted by severity", async () => {
    const client = await connect(scriptedFetch([{ status: "running" }, {}]).fetch);
    const { isError, texts } = await call(client, "sniff_score", { url: "my-app.lovable.app" });
    expect(isError).toBe(false);
    expect(texts[0]).toContain("Sniff Score 72/100 · A bit whiffy · lovable");
    expect(texts[0]).toContain("3 findings (1 severe, 1 annoying, 1 cosmetic)");
    expect(texts[0]).toMatch(/call sniff_score again/);
    const data = JSON.parse(texts[1]);
    expect(data.score).toBe(72);
    expect(data.fix_prompt).toContain("Lovable");
    expect(data.findings.map((f: { severity: string }) => f.severity)).toEqual(["severe", "annoying", "cosmetic"]);
    expect(texts[1]).not.toContain("\n  "); // compact, not pretty-printed
  });

  it("sniff_score returns isError with the key URL when no key is set", async () => {
    const client = await connect(scriptedFetch([{}]).fetch, "");
    const { isError, texts } = await call(client, "sniff_score", { url: "https://my-app.com" });
    expect(isError).toBe(true);
    expect(texts[0]).toContain("no_key");
    expect(texts[0]).toContain("https://bugsniffer.io/score/api-key");
  });

  it("sniff_score reports a blocked domain", async () => {
    const { fetch } = scriptedFetch([{}], json({ error: "blocked", message: "Big-brand sites are off the menu." }, 403));
    const client = await connect(fetch);
    const { isError, texts } = await call(client, "sniff_score", { url: "https://google.com" });
    expect(isError).toBe(true);
    expect(texts[0]).toContain("blocked");
    expect(texts[0]).toContain("off the menu");
  });

  it("sniff_score times out with an id to check back on", async () => {
    const client = await connect(scriptedFetch([{ status: "running" }]).fetch);
    const { isError, texts } = await call(client, "sniff_score", { url: "https://my-app.com" });
    expect(isError).toBe(true);
    expect(texts[0]).toContain('get_sniff_result("abc123")');
  });

  it("get_sniff_result returns a running status without waiting", async () => {
    const client = await connect(scriptedFetch([{ status: "running" }]).fetch);
    const { isError, texts } = await call(client, "get_sniff_result", { id: "abc123" });
    expect(isError).toBe(false);
    expect(texts[0]).toContain("is running");
  });

  it("get_sniff_result flags a failed sniff as an error", async () => {
    const client = await connect(scriptedFetch([{ status: "failed", error: "timeout loading page" }]).fetch);
    const { isError, texts } = await call(client, "get_sniff_result", { id: "abc123" });
    expect(isError).toBe(true);
    expect(texts[0]).toContain("timeout loading page");
  });

  it("bugsniffer_upgrade_info links pricing and the free score", async () => {
    const client = await connect(scriptedFetch([{}]).fetch);
    const { texts } = await call(client, "bugsniffer_upgrade_info");
    expect(texts[0]).toContain("https://bugsniffer.io/#pricing");
    expect(texts[0]).toContain("https://bugsniffer.io/score");
    const data = JSON.parse(texts[1]);
    expect(data.smoke.price).toContain("$149");
    expect(data.deep.price).toContain("$349");
  });
});
