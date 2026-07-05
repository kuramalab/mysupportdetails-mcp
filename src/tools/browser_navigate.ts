import { z } from 'zod';
import { requireActive } from '../browser-manager.js';
import { jsonReply } from './_reply.js';

export const name = 'browser_navigate';

export const description = 'Navigate the active page to a URL. Waits for load event by default.';

export const inputSchema = {
  url: z.string().url().describe('URL to navigate to (http/https)'),
  wait_until: z.enum(['load', 'domcontentloaded', 'networkidle', 'commit']).optional()
    .describe('When to consider navigation complete. Default: load'),
  timeout_ms: z.number().int().min(1000).max(120_000).optional()
    .describe('Timeout in ms. Default 30000'),
};

export async function handler(args: {
  url: string;
  wait_until?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout_ms?: number;
}) {
  const { page } = requireActive();
  const response = await page.goto(args.url, {
    waitUntil: args.wait_until ?? 'load',
    timeout: args.timeout_ms ?? 30_000,
  });
  return jsonReply({
    url: page.url(),
    status: response?.status() ?? null,
    title: await page.title(),
  });
}
