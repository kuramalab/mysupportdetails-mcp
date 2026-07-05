import { close } from '../browser-manager.js';
import { jsonReply } from './_reply.js';

export const name = 'browser_close';

export const description = 'Close the currently active browser context and save last_used metadata.';

export const inputSchema = {};

export async function handler(_args: Record<string, never>) {
  await close();
  return jsonReply({ closed: true });
}
