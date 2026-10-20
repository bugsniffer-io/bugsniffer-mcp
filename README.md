# Bugsniffer

[![npm](https://img.shields.io/npm/v/bugsniffer?color=266be9&label=npm)](https://www.npmjs.com/package/bugsniffer)
[![Sniffed by Bugsniffer](https://img.shields.io/badge/sniffed%20by-Bugsniffer-266be9)](https://bugsniffer.io/score)
[![MCP](https://img.shields.io/badge/MCP-server-0a1636)](https://bugsniffer.io/mcp)

**We test the back end. Literally.**

Your agent shipped it. Your agent says it works. Your agent also marks its own homework.

Bugsniffer is AI-run QA for vibe-coded apps, and this package puts the dog inside your editor. Say "sniff my app" in Cursor, Claude Code, Codex, Windsurf or VS Code and you get a free **Sniff Score** out of 100, a verdict, the findings as structured JSON, and a fix prompt your agent can act on straight away. Fix, redeploy, re-sniff, watch the number go up.

```
  Bugsniffer · https://my-app.lovable.app

  72/100  A bit whiffy  (lovable)

  Findings (3)
  SEVERE    3 console errors
            TypeError: Cannot read properties of undefined (reading 'map')
  ANNOYING  Slow first paint
            LCP 4.1 s on mobile
  COSMETIC  1 broken link
            /old-blog returns 404

  Fix prompt (paste into Cursor, Claude Code, Lovable, Bolt...)
  ...
```

Verdicts: 90+ **Squeaky clean**, 70 to 89 **A bit whiffy**, 40 to 69 **Something died in here**, under 40 **Absolute stinker**.

**Privacy:** it only loads your homepage like a visitor would. One page load at desktop width and one at phone width. It doesn't log in, fill in forms, press buttons or crawl other pages. Only sniff apps you own.

## 1. Get a free key

Grab one at **https://bugsniffer.io/score/api-key**. It's shown once, so copy it somewhere safe. Free keys get 10 sniffs a day.

## 2. Install

Every client runs the same command: `npx -y bugsniffer mcp`, with `BUGSNIFFER_API_KEY` in its environment. Node 18 or newer.

### Claude Code

```bash
claude mcp add bugsniffer --scope user -e BUGSNIFFER_API_KEY=your-key-here -- npx -y bugsniffer mcp
```

Or as a plugin, which also gives you a `/bugsniffer:sniff` command:

```
/plugin marketplace add bugsniffer-io/bugsniffer-mcp
/plugin install bugsniffer@bugsniffer
```

(Plugin users set `BUGSNIFFER_API_KEY` in their shell before starting Claude Code.)

### Cursor

[Add to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=bugsniffer&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImJ1Z3NuaWZmZXIiLCJtY3AiXSwiZW52Ijp7IkJVR1NOSUZGRVJfQVBJX0tFWSI6InlvdXIta2V5LWhlcmUifX0=), then paste your key into the env value. Or add this to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project):

```json
{
  "mcpServers": {
    "bugsniffer": {
      "command": "npx",
      "args": ["-y", "bugsniffer", "mcp"],
      "env": { "BUGSNIFFER_API_KEY": "your-key-here" }
    }
  }
}
```

### Codex

```bash
codex mcp add bugsniffer --env BUGSNIFFER_API_KEY=your-key-here -- npx -y bugsniffer mcp
```

Or in `~/.codex/config.toml`:

```toml
[mcp_servers.bugsniffer]
command = "npx"
args = ["-y", "bugsniffer", "mcp"]
env = { BUGSNIFFER_API_KEY = "your-key-here" }
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json` (or Settings, Cascade, MCP servers, View raw config):

```json
{
  "mcpServers": {
    "bugsniffer": {
      "command": "npx",
      "args": ["-y", "bugsniffer", "mcp"],
      "env": { "BUGSNIFFER_API_KEY": "your-key-here" }
    }
  }
}
```

### VS Code (Copilot agent mode)

Add to `.vscode/mcp.json`. VS Code asks for the key once and stores it securely:

```json
{
  "inputs": [
    { "type": "promptString", "id": "bugsniffer-key", "description": "Bugsniffer API key", "password": true }
  ],
  "servers": {
    "bugsniffer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "bugsniffer", "mcp"],
      "env": { "BUGSNIFFER_API_KEY": "${input:bugsniffer-key}" }
    }
  }
}
```

On Windows, if a client can't find `npx`, use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "bugsniffer", "mcp"]`.

## 3. Use it

Ask your agent things like:

- "I just deployed. Sniff https://my-app.vercel.app and fix what it finds."
- "Re-sniff the app and tell me if the score went up."
- "What would a full QA run test that this doesn't?"

### Tools

| Tool | What it does |
|------|--------------|
| `sniff_score(url)` | Scores a deployed app's homepage. Waits up to 60 s, then returns the score, verdict, findings, fix prompt and a shareable result link. |
| `get_sniff_result(id)` | Fetches an earlier sniff by id. Use it when `sniff_score` timed out, or to re-read findings without spending a sniff. |
| `bugsniffer_upgrade_info()` | What the paid Smoke and Deep runs add, with links. Read-only; it never buys anything. |

## CLI

```bash
export BUGSNIFFER_API_KEY=your-key-here
npx bugsniffer https://my-app.lovable.app          # coloured score, findings and fix prompt
npx bugsniffer my-app.lovable.app --json           # JSON for scripts and CI
npx bugsniffer my-app.lovable.app --timeout 90     # wait longer
npx bugsniffer mcp                                 # start the MCP server
```

Exit code 0 when the sniff finished, 1 on any error (no key, rate limit, blocked domain, timeout), 2 on bad usage. `NO_COLOR` is respected.

## What the free score doesn't check

Signup. Login. Password reset. Forms. Checkout. Every page that isn't your homepage. That's where the expensive bugs live.

- **Smoke, $149** (first 20 sniffs $99). The quick sniff. Every public page crawled, every form and button pressed, desktop and mobile, console and network errors, broken links, basic accessibility. Report in about 2 hours.
- **Deep, $349.** The full cavity search. Everything in Smoke, plus logged-in flows with a test account you give us: signup, login, password reset and the 3 to 5 flows you care about most. Payments in test mode. Report in about 4 hours.

Run 100% by AI. Two models: one drives a real browser, the other writes the tests and argues with the evidence. Nobody marks their own work. No call. No humans.

**[Pricing](https://bugsniffer.io/#pricing)** · **[Free score in the browser](https://bugsniffer.io/score)**

## Show off your score

Paste this into your README once the dog's happy:

```markdown
[![Sniffed by Bugsniffer](https://img.shields.io/badge/sniffed%20by-Bugsniffer-266be9)](https://bugsniffer.io/score)
```

## Limits and errors

- **No key:** the tools tell your agent where to get one.
- **10 sniffs a day per key.** After that the dog needs a lie down until tomorrow.
- **Blocked domains:** big brands, banks, government sites and the web's 10,000 busiest sites are off the menu. Sniff your own app.
- **Not localhost.** Deploy first; the dog can't reach your laptop.

## Development

```bash
npm install
npm run build   # tsc to dist/
npm test        # vitest, API stubbed
```

Questions: support@bugsniffer.io. MIT licensed.
