import { z } from 'zod';
import { BrowserEnum, ProfileName } from '../schemas.js';
import { createProfile } from '../profile-store.js';
import { jsonReply } from './_reply.js';

export const name = 'profile_create';

export const description = 'Create an empty named profile for a specific browser engine.';

export const inputSchema = {
  browser: BrowserEnum,
  name: ProfileName,
  notes: z.string().max(500).optional(),
};

export async function handler(args: {
  browser: 'chromium' | 'firefox' | 'webkit';
  name: string;
  notes?: string;
}) {
  const meta = createProfile(args.browser, args.name, args.notes ?? null);
  return jsonReply({ created: true, profile: meta });
}
