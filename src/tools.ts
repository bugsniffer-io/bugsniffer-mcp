import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BugsnifferClient, BugsnifferError } from "./api.js";
import { agentSummary, compactResult } from "./format.js";
import { UPGRADE_INFO, upgradeSummary } from "./upgrade.js";
import type { ScoreResult } from "./types.js";

export const SNIFF_TIMEOUT_MS = 60_000;

function scoreResult(result: ScoreResult) {
  return {
    content: [
      { type: "text" as const, text: agentSummary(result) },
      { type: "text" as const, text: JSON.stringify(compactResult(result)) },
    ],
  };
}

function errorResult(error: unknown) {
  const message =
    error instanceof BugsnifferError
      ? `Bugsniffer ${error.code}: ${error.message}`
      : `Bugsniffer error: ${(error as Error).message ?? String(error)}`;
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export interface ToolDeps {
  client?: BugsnifferClient;
  timeoutMs?: number;
  intervalMs?: number;
}

export function registerTools(server: McpServer, deps: ToolDeps = {}): void {
  const client = deps.client ?? new BugsnifferClient({ client: "mcp" });
  const timeoutMs = deps.timeoutMs ?? SNIFF_TIMEOUT_MS;

  // 1. sniff_score
  server.registerTool(
    "sniff_score",
    {
      title: "Sniff Score a web app",
      description: [
        "Run a free Bugsniffer Sniff Score on a deployed web app's public homepage and get a 0-100 score, a verdict, structured findings (console errors, failed requests, broken links, slow load, mobile layout, accessibility, SEO) and a fix_prompt you can act on.",
        "Call it after deploying or redeploying a web app to check its homepage health, before telling the user a launch is ready, when the user says 'sniff my app', 'check my site' or 'is my app broken', and again after fixing findings to confirm the score went up.",
        "Takes 20-60 seconds. Needs a public http(s) URL, not localhost. Only sniff apps the user owns. Loads the homepage once, like a visitor; it does not log in, submit forms or crawl other pages.",
      ].join(" "),
      inputSchema: z.object({
        url: z.string().describe("Public URL of the deployed app, e.g. https://my-app.lovable.app"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: false },
    },
    async ({ url }, extra) => {
      const progressToken = extra?._meta?.progressToken;
      let tick = 0;
      try {
        const result = await client.sniff(url, {
          timeoutMs,
          intervalMs: deps.intervalMs,
          onStatus: (r) => {
            if (progressToken === undefined) return;
            tick += 1;
            void extra
              .sendNotification({
                method: "notifications/progress",
                params: { progressToken, progress: tick, message: `Sniffing (${r.status})` },
              })
              .catch(() => {});
          },
        });
        return scoreResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // 2. get_sniff_result
  server.registerTool(
    "get_sniff_result",
    {
      title: "Get a Sniff Score result",
      description:
        "Fetch a Bugsniffer Sniff Score by id. Use it when sniff_score timed out and gave you an id to check back on, or to re-read the findings and fix_prompt of an earlier sniff without spending a new score. Returns immediately with status queued, running, done or failed.",
      inputSchema: z.object({
        id: z.string().describe("The sniff id returned by sniff_score"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: true },
    },
    async ({ id }) => {
      try {
        const result = await client.getScore(id);
        if (result.status === "failed") {
          return errorResult(
            new BugsnifferError("failed", `Sniff ${id} failed${result.error ? `: ${result.error}` : ""}. Check the homepage loads in a normal browser, then run sniff_score again.`)
          );
        }
        return scoreResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // 3. bugsniffer_upgrade_info
  server.registerTool(
    "bugsniffer_upgrade_info",
    {
      title: "What Bugsniffer Smoke and Deep add",
      description:
        "Explain what the paid Bugsniffer runs (Smoke $149, Deep $349) test beyond the free homepage Sniff Score: every page, every form and button, signup, login, password reset and payments, with a screenshot bug report in 2-4 hours. Call it when the user asks for a fuller QA pass, before a launch, or when the free score can't cover what they need tested. Read-only; never buys anything.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: false, idempotentHint: true },
    },
    async () => ({
      content: [
        { type: "text" as const, text: upgradeSummary() },
        { type: "text" as const, text: JSON.stringify(UPGRADE_INFO) },
      ],
    })
  );
}
