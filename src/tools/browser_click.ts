import { z } from 'zod';
import { requireActive } from '../browser-manager.js';
import { jsonReply } from './_reply.js';

export const name = 'browser_click';

export const description =
  'Click an element by Playwright selector (CSS, text=, role=). ' +
  'Use browser_snapshot first to discover selectors.';

export const inputSchema = {
  selector: z.string().min(1).max(500).describe('Playwright selector (CSS/text/role)'),
  button: z.enum(['left', 'right', 'middle']).optional().describe('Mouse button. Default left'),
  timeout_ms: z.number().int().min(100).max(30_000).optional().describe('Timeout ms. Default 5000'),
};

export async function handler(args: { selector: string; button?: 'left' | 'right' | 'middle'; timeout_ms?: number }) {
  const { page } = requireActive();
  await page.click(args.selector, {
    button: args.button ?? 'left',
    timeout: args.timeout_ms ?? 5000,
  });
  return jsonReply({ clicked: true, selector: args.selector });
}
