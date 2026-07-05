// Central registry of every MCP tool. Imports each file and registers it
// with the SDK McpServer in a single pass.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import * as browserOpen from './browser_open.js';
import * as browserClose from './browser_close.js';
import * as browserNavigate from './browser_navigate.js';
import * as browserSnapshot from './browser_snapshot.js';
import * as browserScreenshot from './browser_screenshot.js';
import * as browserClick from './browser_click.js';
import * as browserType from './browser_type.js';
import * as browserPressKey from './browser_press_key.js';
import * as browserWaitFor from './browser_wait_for.js';
import * as browserEvaluate from './browser_evaluate.js';
import * as profileList from './profile_list.js';
import * as profileCreate from './profile_create.js';
import * as profileDelete from './profile_delete.js';
import * as profileCurrent from './profile_current.js';

interface ToolModule {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: never) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}

const ALL_TOOLS: ToolModule[] = [
  browserOpen as unknown as ToolModule,
  browserClose as unknown as ToolModule,
  browserNavigate as unknown as ToolModule,
  browserSnapshot as unknown as ToolModule,
  browserScreenshot as unknown as ToolModule,
  browserClick as unknown as ToolModule,
  browserType as unknown as ToolModule,
  browserPressKey as unknown as ToolModule,
  browserWaitFor as unknown as ToolModule,
  browserEvaluate as unknown as ToolModule,
  profileList as unknown as ToolModule,
  profileCreate as unknown as ToolModule,
  profileDelete as unknown as ToolModule,
  profileCurrent as unknown as ToolModule,
];

export function registerAllTools(server: McpServer): void {
  for (const tool of ALL_TOOLS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (server as any).tool(tool.name, tool.description, tool.inputSchema, tool.handler);
  }
}

export function listRegisteredToolNames(): string[] {
  return ALL_TOOLS.map((t) => t.name);
}
