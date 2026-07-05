import { requireActive } from '../browser-manager.js';
import { jsonReply } from './_reply.js';

export const name = 'browser_snapshot';

export const description =
  'Return the accessibility tree of the active page. Agent-friendly representation ' +
  'of what a screen reader would see (role, name, value, focused).';

export const inputSchema = {};

export async function handler(_args: Record<string, never>) {
  const { page } = requireActive();
  // Playwright ariaSnapshot() returns YAML for the accessibility tree, an ideal
  // format for LLMs (more compact than JSON and semantically structured).
  // Stable since Playwright 1.44+ and recommended over the older
  // page.accessibility.snapshot() API (removed in 1.48).
  const snapshot = await page.locator('body').ariaSnapshot();
  return jsonReply({
    url: page.url(),
    title: await page.title(),
    tree: snapshot,
  });
}
