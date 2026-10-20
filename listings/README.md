# Listing drafts

Drafts only. Nothing here has been submitted, and no accounts exist yet.

Shared copy, reused across listings:

- **Name:** Bugsniffer
- **One-liner (99 chars):** Free Sniff Score for your deployed web app: score, findings and a fix prompt your agent can act on.
- **Short pitch:** AI-run QA for vibe-coded apps, inside your editor. Say "sniff my app" and get a score out of 100, the findings as JSON and a fix prompt. Fix, redeploy, re-sniff. It only loads your homepage like a visitor would. Free key, 10 sniffs a day.
- **Tagline:** We test the back end. Literally.
- **Website:** https://bugsniffer.io/mcp
- **Repo :** https://github.com/bugsniffer-io/bugsniffer-mcp
- **Icon:** `../icon.png` (512 x 512 paw)
- **Install command:** `npx -y bugsniffer mcp` with env `BUGSNIFFER_API_KEY`

Order to publish: GitHub repo, then npm, then the official registry (it checks npm), then the rest.

| Target | Draft | Files it needs |
|--------|-------|----------------|
| npm | [npm.md](npm.md) | `package.json`, `dist/`, `README.md`, `LICENSE` |
| Official MCP registry | [mcp-registry.md](mcp-registry.md) | `server.json`, `mcpName` in `package.json` |
| Smithery | [smithery.md](smithery.md) | `manifest.json`, `icon.png`, `.mcpbignore` (MCPB bundle); `smithery.yaml` (legacy) |
| Cursor directory | [cursor-directory.md](cursor-directory.md) | README deeplink |
| Claude Code plugin marketplace | [claude-code-plugin.md](claude-code-plugin.md) | `.claude-plugin/marketplace.json`, `plugins/bugsniffer/` |
| mcp.so | [mcp-so.md](mcp-so.md) | GitHub URL |
