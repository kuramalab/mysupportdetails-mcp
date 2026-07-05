import { requireActive } from '../browser-manager.js';
import { jsonReply } from './_reply.js';

export const name = 'browser_snapshot';

export const description =
  'Return the accessibility tree of the active page. Agent-friendly representation ' +
  'of what a screen reader would see (role, name, value, focused).';

export const inputSchema = {};

export async function handler(_args: Record<string, never>) {
  const { page } = requireActive();
  // Playwright ariaSnapshot() restituisce YAML dell'accessibility tree, formato
  // ideale per gli LLM (piu' compatto del JSON e semanticamente strutturato).
  // Stabile dal Playwright 1.44+ e raccomandato al posto della vecchia
  // API page.accessibility.snapshot() (rimossa dal 1.48).
  const snapshot = await page.locator('body').ariaSnapshot();
  return jsonReply({
    url: page.url(),
    title: await page.title(),
    tree: snapshot,
  });
}
