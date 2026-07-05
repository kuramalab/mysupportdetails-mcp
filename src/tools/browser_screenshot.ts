import { z } from 'zod';
import { requireActive } from '../browser-manager.js';
import { jsonReply } from './_reply.js';
import { writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

export const name = 'browser_screenshot';

export const description =
  'Take a PNG screenshot of the active page. If path is provided, save to disk; ' +
  'otherwise return base64. Requires absolute path if path is set.';

export const inputSchema = {
  full_page: z.boolean().optional().describe('Full scrollable page vs current viewport. Default false'),
  path: z.string().optional().describe('Absolute path to save PNG. If omitted, base64 returned.'),
};

export async function handler(args: { full_page?: boolean; path?: string }) {
  const { page } = requireActive();
  const buf = await page.screenshot({
    fullPage: args.full_page ?? false,
    type: 'png',
  });
  if (args.path !== undefined) {
    if (!isAbsolute(args.path)) {
      throw new Error(`INVALID_PATH: path must be absolute, got "${args.path}"`);
    }
    writeFileSync(resolve(args.path), buf);
    return jsonReply({ path: resolve(args.path), bytes: buf.length });
  }
  return jsonReply({ base64: buf.toString('base64'), bytes: buf.length });
}
