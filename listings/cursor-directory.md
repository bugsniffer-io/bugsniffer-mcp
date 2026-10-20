# Cursor directory (cursor.directory/mcp)

Submit through the "Submit" / "New MCP" form on cursor.directory (sign in with the brand GitHub account). Free, self-serve.

**Name:** Bugsniffer
**Short description:** Free Sniff Score for your deployed web app: score, findings and a fix prompt your agent can act on.
**Description:**
AI-run QA for vibe-coded apps, inside Cursor. Ask "sniff my app" after you deploy and Bugsniffer loads your homepage once, like a visitor would, then returns a score out of 100, the findings as JSON (console errors, failed requests, broken links, speed, mobile layout, accessibility, SEO) and a fix prompt Cursor can act on straight away. Fix, redeploy, re-sniff, watch the number go up.

Free key at https://bugsniffer.io/score/api-key (30 sniffs a day). Paid Smoke and Deep runs test signup, login, forms and checkout.

We test the back end. Literally.

**Category:** Developer Tools (secondary: Testing)
**Tags:** qa, testing, web, lighthouse, vibe-coding
**Website:** https://bugsniffer.io/mcp
**GitHub:** https://github.com/bugsniffer-io/bugsniffer-mcp
**Logo:** `../icon.png`

**Install config:**
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

**One-click link** (also in the README):
`cursor://anysphere.cursor-deeplink/mcp/install?name=bugsniffer&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImJ1Z3NuaWZmZXIiLCJtY3AiXSwiZW52Ijp7IkJVR1NOSUZGRVJfQVBJX0tFWSI6InlvdXIta2V5LWhlcmUifX0=`

Use it for an "Add to Cursor" button on bugsniffer.io/mcp.
