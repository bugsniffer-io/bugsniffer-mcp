import { BugsnifferClient, BugsnifferError, KEY_URL } from "./api.js";
import { compactResult, painter, renderCli } from "./format.js";
import { VERSION } from "./version.js";

export interface CliIO {
  stdout: { write(s: string): unknown; isTTY?: boolean };
  stderr: { write(s: string): unknown; isTTY?: boolean };
  env: Record<string, string | undefined>;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  startServer?: () => Promise<void>;
}

export const HELP = `bugsniffer ${VERSION}: a free Sniff Score for your web app's homepage

Usage
  npx bugsniffer <url>            Score a deployed app, print findings and a fix prompt
  npx bugsniffer <url> --json     Same, as JSON for scripts and CI
  npx bugsniffer mcp              Start the MCP server (stdio) for Cursor, Claude Code, Codex...

Options
  --json             Machine-readable output
  --timeout <sec>    How long to wait for the score (default 60)
  --no-color         Plain output (NO_COLOR is respected too)
  -h, --help         Show this help
  -v, --version      Show the version

Needs BUGSNIFFER_API_KEY. Free keys (10 sniffs a day): ${KEY_URL}
It only loads your homepage once, like a visitor would. Only sniff apps you own.
`;

interface Args {
  command: "help" | "version" | "mcp" | "score";
  url?: string;
  json: boolean;
  color?: boolean;
  timeoutSec: number;
}

export function parseArgs(argv: string[]): Args | { error: string } {
  const args: Args = { command: "score", json: false, timeoutSec: 60 };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { ...args, command: "help" };
    if (a === "-v" || a === "--version") return { ...args, command: "version" };
    if (a === "--json") args.json = true;
    else if (a === "--no-color") args.color = false;
    else if (a === "--color") args.color = true;
    else if (a === "--timeout" || a.startsWith("--timeout=")) {
      const raw = a.includes("=") ? a.split("=")[1] : argv[++i];
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return { error: `--timeout needs a number of seconds, got "${raw ?? ""}"` };
      args.timeoutSec = n;
    } else if (a.startsWith("-")) return { error: `Unknown option ${a}` };
    else positional.push(a);
  }
  if (positional[0] === "mcp" && positional.length === 1) return { ...args, command: "mcp" };
  if (positional.length === 0) return { ...args, command: "help" };
  if (positional.length > 1) return { error: "Sniff one URL at a time." };
  return { ...args, url: positional[0] };
}

function useColor(io: CliIO, override: boolean | undefined): boolean {
  if (override !== undefined) return override;
  if (io.env.NO_COLOR) return false;
  if (io.env.FORCE_COLOR && io.env.FORCE_COLOR !== "0") return true;
  return Boolean(io.stdout.isTTY);
}

export async function run(argv: string[], io: CliIO): Promise<number> {
  const parsed = parseArgs(argv);
  if ("error" in parsed) {
    io.stderr.write(`${parsed.error}\n\n${HELP}`);
    return 2;
  }
  if (parsed.command === "help") {
    io.stdout.write(HELP);
    return 0;
  }
  if (parsed.command === "version") {
    io.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (parsed.command === "mcp") {
    if (!io.startServer) throw new Error("MCP server not available");
    await io.startServer();
    return 0;
  }

  const url = parsed.url as string;
  const color = useColor(io, parsed.color);
  const p = painter(color && Boolean(io.stderr.isTTY));
  const client = new BugsnifferClient({
    apiKey: io.env.BUGSNIFFER_API_KEY,
    fetch: io.fetch,
    sleep: io.sleep,
    now: io.now,
    client: "cli",
  });
  const showProgress = !parsed.json && Boolean(io.stderr.isTTY);

  try {
    if (showProgress) io.stderr.write(p.dim(`Sniffing ${url}...\n`));
    const result = await client.sniff(url, { timeoutMs: parsed.timeoutSec * 1000 });
    if (parsed.json) io.stdout.write(`${JSON.stringify(compactResult(result), null, 2)}\n`);
    else io.stdout.write(renderCli(result, url, color));
    return 0;
  } catch (error) {
    const err =
      error instanceof BugsnifferError ? error : new BugsnifferError("api", (error as Error).message ?? String(error));
    if (parsed.json) {
      io.stdout.write(`${JSON.stringify({ error: err.code, message: err.message, ...(err.id ? { id: err.id } : {}) }, null, 2)}\n`);
    } else {
      const ep = painter(color);
      io.stderr.write(`${ep.red(ep.bold("Bugsniffer:"))} ${err.message}\n`);
    }
    return 1;
  }
}
