#!/usr/bin/env node
// Entry point of the @kuramalab-io/mysupportdetails-mcp MCP server.
//
// Communication with the client (Claude Code, Cursor, Cline, etc.) via stdio:
// - stdout: RESERVED for the MCP JSON-RPC protocol. Any spurious write
//   (console.log, print) breaks parsing on the client side.
// - stderr: free channel for diagnostic logs.
//
// See docs/ARCHITECTURE.md for the component map.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools, listRegisteredToolNames } from './tools/index.js';
import { close as closeBrowser } from './browser-manager.js';

const server = new McpServer({
  name: 'mysupportdetails-mcp',
  version: '0.1.0',
});

registerAllTools(server);

// Signal-driven cleanup: closes the active browser context before exiting,
// saving last_used metadata on the profile (see browser-manager.close()).
async function shutdown(): Promise<void> {
  try {
    await closeBrowser();
  } catch {
    /* ignore: if the context was already dead or never opened, do not block shutdown */
  }
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});

const transport = new StdioServerTransport();
await server.connect(transport);

// Log only to stderr: stdout is reserved for MCP JSON-RPC.
process.stderr.write(
  `[mysupportdetails-mcp] server started, ${listRegisteredToolNames().length} tools registered\n`,
);
