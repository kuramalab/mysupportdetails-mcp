import { getActive } from '../browser-manager.js';
import { jsonReply } from './_reply.js';

export const name = 'profile_current';

export const description = 'Return info about the active browser/profile (if any is open).';

export const inputSchema = {};

export async function handler(_args: Record<string, never>) {
  const active = getActive();
  if (active === null) {
    return jsonReply({ active: false });
  }
  return jsonReply({
    active: true,
    browser: active.browser,
    profile: active.profile,
    headed: active.headed,
    viewport: active.viewport,
    url_current: active.page.url(),
    opened_at: active.openedAt,
  });
}
