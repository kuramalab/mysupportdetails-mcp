import { z } from 'zod';
import { requireActive } from '../browser-manager.js';
import { jsonReply } from './_reply.js';

export const name = 'browser_type';

export const description = 'Type text into an input/textarea/contenteditable element by selector.';

export const inputSchema = {
  selector: z.string().min(1).max(500),
  text: z.string(),
  submit: z.boolean().optional().describe('Press Enter after typing. Default false'),
  timeout_ms: z.number().int().min(100).max(30_000).optional(),
};

export async function handler(args: { selector: string; text: string; submit?: boolean; timeout_ms?: number }) {
  const { page } = requireActive();
  await page.fill(args.selector, args.text, { timeout: args.timeout_ms ?? 5000 });
  if (args.submit === true) {
    await page.press(args.selector, 'Enter');
  }
  return jsonReply({ typed: true, chars: args.text.length, submitted: args.submit === true });
}
