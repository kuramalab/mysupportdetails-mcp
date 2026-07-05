import { BrowserEnum } from '../schemas.js';
import { listProfiles } from '../profile-store.js';
import { jsonReply } from './_reply.js';

export const name = 'profile_list';

export const description = 'List all named profiles, optionally filtered by browser engine.';

export const inputSchema = {
  browser: BrowserEnum.optional().describe('Filter by browser. Omit for all.'),
};

export async function handler(args: { browser?: 'chromium' | 'firefox' | 'webkit' }) {
  const profiles = listProfiles(args.browser);
  return jsonReply({ profiles });
}
