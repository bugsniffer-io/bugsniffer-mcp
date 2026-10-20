# Claude Code plugin marketplace

This repo is itself a plugin marketplace. Both manifests pass `claude plugin validate`.

**Files:** `../.claude-plugin/marketplace.json` (marketplace `bugsniffer`), `../plugins/bugsniffer/.claude-plugin/plugin.json`, `../plugins/bugsniffer/.mcp.json` (runs `npx -y bugsniffer mcp`, reads `BUGSNIFFER_API_KEY` from the shell), `../plugins/bugsniffer/commands/sniff.md` (`/bugsniffer:sniff <url>`: sniff, fix the findings, offer a re-sniff).

**Category:** testing
**Description:** Free Sniff Score for your deployed web app, inside Claude Code: score, findings and a fix prompt, plus /bugsniffer:sniff.

**How users install (once the GitHub repo is public):**
```
/plugin marketplace add bugsniffer/bugsniffer-mcp
/plugin install bugsniffer@bugsniffer
```

**Getting into Anthropic's official directory (optional, after launch):** submit the plugin through Anthropic's plugin directory submission form (linked from the Claude Code plugins docs) with the repo URL and this text:

> Bugsniffer gives Claude Code a free Sniff Score for any deployed web app the user owns. It loads the public homepage once, like a visitor would, and returns a 0-100 score, structured findings and a fix prompt; `/bugsniffer:sniff` runs sniff, fix, re-sniff in one go. Needs a free API key (10 sniffs a day). Open source, MIT.

If the repo path changes, update the `/plugin marketplace add` line here and in the README.
