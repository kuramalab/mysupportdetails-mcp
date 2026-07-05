import { z } from 'zod';
import { requireActive } from '../browser-manager.js';
import { jsonReply } from './_reply.js';

export const name = 'browser_wait_for';

export const description =
  'Wait for a condition: selector visible, text present in page, or timeout. ' +
  'At least one of selector/text is required.';

export const inputSchema = {
  selector: z.string().optional().describe('CSS/text/role selector to wait for'),
  text: z.string().optional().describe('Text substring to wait for in page'),
  timeout_ms: z.number().int().min(100).max(60_000).optional().describe('Timeout ms. Default 5000'),
};

export async function handler(args: { selector?: string; text?: string; timeout_ms?: number }) {
  const { page } = requireActive();
  const timeout = args.timeout_ms ?? 5000;
  const started = Date.now();
  if (args.selector !== undefined) {
    await page.waitForSelector(args.selector, { timeout });
  } else if (args.text !== undefined) {
    // Playwright locator().waitFor() uses the built-in text= engine: more
    // reliable than waitForFunction on document.body (which is not typed on
    // the Node side and would require the "DOM" lib, polluting the ambient
    // type-check of the server-side app).
    await page.getByText(args.text, { exact: false }).first().waitFor({
      state: 'visible',
      timeout,
    });
  } else {
    throw new Error('MISSING_INPUT: provide selector or text');
  }
  return jsonReply({ waited_ms: Date.now() - started });
}
