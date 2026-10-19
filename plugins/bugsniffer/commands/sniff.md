---
description: Sniff a deployed web app's homepage with Bugsniffer, then fix what it finds
argument-hint: <url>
---

Run the Bugsniffer `sniff_score` tool on $ARGUMENTS. If no URL was given, work out this project's deployed URL from its config (vercel.json, netlify.toml, wrangler.toml, package.json homepage, README) and confirm it with me before sniffing. Only sniff apps I own; never localhost.

Then:

1. Show me the score, the verdict and the findings, most severe first.
2. Use the findings and `fix_prompt` to find the cause of each one in this codebase and fix it. Skip anything that needs a product decision and tell me why.
3. Tell me to redeploy, and offer to re-sniff afterwards so we can see the score go up.

If the tool says the API key is missing, tell me to get a free one at https://bugsniffer.io/score/api-key and set `BUGSNIFFER_API_KEY` before starting Claude Code.
