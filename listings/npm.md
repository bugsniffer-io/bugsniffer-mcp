# npm

**Name:** `bugsniffer`. Checked 20 Oct 2026 with `npm view bugsniffer`: 404, so it's free.

Fallbacks if it's taken by the time you publish, in order:
1. `@bugsniffer/cli` (needs an npm org called `bugsniffer`; the bin stays `bugsniffer`, so it becomes `npx @bugsniffer/cli`)
2. `bugsniffer-mcp`
3. `sniff-score`

Changing the name means updating `package.json` `name`, `server.json` `packages[0].identifier`, every `npx -y bugsniffer` in the README, `smithery.yaml`, `plugins/bugsniffer/.mcp.json` and the Cursor deeplink (base64 of the config).

**package.json:** ready as committed. `description`, `keywords`, `bin`, `files`, `engines`, `mcpName`, `repository` and `license` are set. `prepublishOnly` builds and runs the tests.

**Keywords:** mcp, mcp-server, model-context-protocol, qa, testing, lighthouse, web-vitals, cursor, claude-code, codex, windsurf, vibe-coding, bugsniffer

**Steps (Mark):**
```bash
npm adduser                    # brand account, e.g. bugsniffer, with support@bugsniffer.io; turn on 2FA
cd ~/dev/personal/bugsniffer-mcp
npm view bugsniffer            # still 404?
npm publish --access public    # runs build + tests first
```
