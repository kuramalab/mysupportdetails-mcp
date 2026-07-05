import { BrowserEnum, ProfileName } from '../schemas.js';
import { deleteProfile } from '../profile-store.js';
import { close, getActive } from '../browser-manager.js';
import { jsonReply } from './_reply.js';

export const name = 'profile_delete';

export const description =
  'Delete a named profile (removes directory + registry entry). ' +
  'If the profile is currently active, it is closed first.';

export const inputSchema = {
  browser: BrowserEnum,
  name: ProfileName,
};

export async function handler(args: { browser: 'chromium' | 'firefox' | 'webkit'; name: string }) {
  const active = getActive();
  if (active !== null && active.browser === args.browser && active.profile === args.name) {
    await close();
  }
  deleteProfile(args.browser, args.name);
  return jsonReply({ deleted: true, browser: args.browser, name: args.name });
}
