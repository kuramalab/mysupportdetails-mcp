import { z } from 'zod';
import { requireActive } from '../browser-manager.js';
import { jsonReply } from './_reply.js';

export const name = 'browser_evaluate';

export const description =
  'Execute JavaScript in the page context and return the JSON-serializable result. ' +
  'Runs inside the browser sandbox, not the Node process (cross-origin restrictions apply).';

export const inputSchema = {
  script: z.string().min(1).max(10_000).describe('JavaScript expression or function body'),
};

export async function handler(args: { script: string }) {
  const { page } = requireActive();
  // Wrap in IIFE per accettare sia espressioni sia bodies.
  const wrapped = `(async () => { ${args.script} })()`;
  const result = await page.evaluate<unknown>(wrapped);
  return jsonReply({ result });
}
