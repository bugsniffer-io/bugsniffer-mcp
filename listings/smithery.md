# Smithery (smithery.ai)

Smithery now lists local stdio servers as **MCPB bundles** (URL publishing needs a hosted Streamable HTTP server, which we don't have). `smithery.yaml` is kept in the repo root for the legacy repo-scan flow and other directories that read it.

**Files:** `../manifest.json` (passes `mcpb validate`), `../icon.png`, `../.mcpbignore`, `../smithery.yaml`.

**Server id:** `bugsniffer/bugsniffer`
**Display name:** Bugsniffer
**Description:** Free Sniff Score for your deployed web app: score, findings and a fix prompt your agent can act on.
**Long description:** AI-run QA for vibe-coded apps. Bugsniffer loads your public homepage once, like a visitor would, and hands your agent a score out of 100, a verdict, structured findings (console errors, failed requests, broken links, speed, mobile layout, accessibility, SEO) and a fix prompt. Fix, redeploy, re-sniff. Free key at https://bugsniffer.io/score/api-key, 30 sniffs a day. Need signup, login, forms and checkout tested? Smoke ($149) and Deep ($349) do the rest.
**Categories/tags:** Developer Tools, Testing, Web, Monitoring
**Config:** one secret field, "Bugsniffer API key" (`api_key`), required.

**Steps (Mark):**
```bash
cd ~/dev/personal/bugsniffer-mcp
npm run build
rm -rf node_modules && npm ci --omit=dev     # bundle ships prod deps only
npx -y @anthropic-ai/mcpb pack . bugsniffer.mcpb
npm install                                  # restore dev deps
# sign in at smithery.ai with the brand GitHub account, then either
#   upload bugsniffer.mcpb at https://smithery.ai/new, or
npx -y @smithery/cli mcp publish ./bugsniffer.mcpb -n bugsniffer/bugsniffer
```
The same `.mcpb` also installs in Claude Desktop by double-click, so attach it to the GitHub release too.
