import { z } from 'zod';
import { BrowserEnum, ProfileName, ViewportSchema } from '../schemas.js';
import { open } from '../browser-manager.js';
import { jsonReply } from './_reply.js';

export const name = 'browser_open';

export const description =
  'Open a browser (chromium/firefox/webkit) with a named persistent profile. ' +
  'Browser is VISIBLE by default (headed). To open headless set env MSD_HEADLESS=1 ' +
  'or pass headed:false. Closes any previously active context.';

export const inputSchema = {
  browser: BrowserEnum.describe('Browser engine to launch'),
  profile: ProfileName.optional().describe('Named profile (created if missing). Default: "default"'),
  headed: z.boolean().optional().describe('Visible window. Default true. Set false only for CI/batch.'),
  viewport: ViewportSchema.optional().describe('Window size in pixels. Default 1440x900'),
};

export async function handler(args: {
  browser: 'chromium' | 'firefox' | 'webkit';
  profile?: string;
  headed?: boolean;
  viewport?: { width: number; height: number };
}) {
  const res = await open({
    browser: args.browser,
    profile: args.profile,
    headed: args.headed,
    viewport: args.viewport,
  });
  return jsonReply(res);
}
