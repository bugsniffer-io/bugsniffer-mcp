# Official MCP registry (registry.modelcontextprotocol.io)

**Server name:** `io.bugsniffer/bugsniffer` (reverse-DNS of bugsniffer.io, verified by a DNS TXT record, so no personal GitHub account is tied to it). Must match `mcpName` in `package.json` (it does).

**Description (99 chars, limit 100):** Free Sniff Score for your deployed web app: score, findings and a fix prompt your agent can act on.

**File:** `../server.json`, validated against the 2025-12-11 schema. Runs `npx bugsniffer mcp` over stdio; `BUGSNIFFER_API_KEY` is required and secret.

The registry has no categories; clients and downstream directories pull from it.

**Steps (Mark), after npm publish:**
```bash
# install the publisher (Linux)
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_linux_amd64.tar.gz" | tar xz mcp-publisher

# one-off DNS key; keep key.pem with the other secrets in ~/dev/important, never in the repo
openssl genpkey -algorithm Ed25519 -out key.pem
PUBLIC_KEY="$(openssl pkey -in key.pem -pubout -outform DER | tail -c 32 | base64)"
echo "bugsniffer.io. IN TXT \"v=MCPv1; k=ed25519; p=${PUBLIC_KEY}\""
# add that TXT record on the apex of bugsniffer.io in Cloudflare DNS, wait for it to propagate

PRIVATE_KEY="$(openssl pkey -in key.pem -noout -text | grep -A3 "priv:" | tail -n +2 | tr -d ' :\n')"
./mcp-publisher login dns --domain bugsniffer.io --private-key "${PRIVATE_KEY}"
./mcp-publisher validate
./mcp-publisher publish
```
Bump `version` in both `server.json` places on every npm release.
