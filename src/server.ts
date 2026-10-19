import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools, type ToolDeps } from "./tools.js";
import { VERSION } from "./version.js";

export function createServer(deps: ToolDeps = {}): McpServer {
  const server = new McpServer({
    name: "bugsniffer",
    version: VERSION,
  });
  registerTools(server, deps);
  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
