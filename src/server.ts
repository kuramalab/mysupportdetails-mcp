#!/usr/bin/env node
// Entry point del server MCP @kuramalab-io/mysupportdetails-mcp.
//
// Comunicazione col client (Claude Code, Cursor, Cline, ecc.) via stdio:
// - stdout: RISERVATO al protocollo JSON-RPC MCP. Qualsiasi write "spurio"
//   (console.log, print) rompe il parsing lato client.
// - stderr: canale libero per log diagnostici.
//
// Vedi docs/ARCHITECTURE.md per la mappa dei componenti.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools, listRegisteredToolNames } from './tools/index.js';
import { close as closeBrowser } from './browser-manager.js';

const server = new McpServer({
  name: 'mysupportdetails-mcp',
  version: '0.1.0',
});

registerAllTools(server);

// Cleanup su segnali: chiude il browser context attivo prima di uscire,
// salvando last_used metadata sul profilo (vedi browser-manager.close()).
async function shutdown(): Promise<void> {
  try {
    await closeBrowser();
  } catch {
    /* ignore: se il context era gia' morto o non aperto, non blocca la shutdown */
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

// Log solo su stderr: stdout e' riservato al JSON-RPC MCP.
process.stderr.write(
  `[mysupportdetails-mcp] server started, ${listRegisteredToolNames().length} tools registered\n`,
);
