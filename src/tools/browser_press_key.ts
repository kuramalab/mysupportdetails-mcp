import { z } from 'zod';
import { requireActive } from '../browser-manager.js';
import { jsonReply } from './_reply.js';

export const name = 'browser_press_key';

export const description = 'Press a keyboard key (Enter, Tab, Escape, Backspace, ArrowLeft, or any Playwright key).';

export const inputSchema = {
  key: z.string().min(1).max(50).describe('Key name (Playwright format)'),
};

export async function handler(args: { key: string }) {
  const { page } = requireActive();
  await page.keyboard.press(args.key);
  return jsonReply({ pressed: args.key });
}
