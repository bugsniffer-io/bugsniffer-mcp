#!/usr/bin/env node
import { run } from "./run.js";
import { startServer } from "./server.js";

const code = await run(process.argv.slice(2), {
  stdout: process.stdout,
  stderr: process.stderr,
  env: process.env,
  startServer,
});

// The MCP server keeps the process alive on stdin; only exit for one-shot commands.
if (process.argv[2] !== "mcp") process.exitCode = code;
