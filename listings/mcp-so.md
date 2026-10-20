# mcp.so

Submit at https://mcp.so/submit (sign in with the brand GitHub account). Free, self-serve.

**Type:** MCP Server
**Name:** Bugsniffer
**URL:** https://github.com/bugsniffer-io/bugsniffer-mcp
**Server config:**
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
**Description:**
AI-run QA for vibe-coded apps. Bugsniffer loads your deployed homepage once, like a visitor would, and hands your agent a score out of 100, a verdict, structured findings and a fix prompt. Fix, redeploy, re-sniff. Works in Cursor, Claude Code, Codex, Windsurf and VS Code. Free key at https://bugsniffer.io/score/api-key, 30 sniffs a day. We test the back end. Literally.

**Category:** Developer Tools
**Tags:** qa, testing, web-performance, accessibility, vibe-coding
**Tools:** sniff_score, get_sniff_result, bugsniffer_upgrade_info
