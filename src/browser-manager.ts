import { chromium, firefox, webkit, type BrowserContext, type Page } from 'playwright';
import { ensureProfile, resolveProfilePath, markLastUsed } from './profile-store.js';
import type { BrowserName } from './schemas.js';

interface ActiveContext {
  browser: BrowserName;
  profile: string;
  context: BrowserContext;
  page: Page;
  openedAt: string;
  headed: boolean;
  viewport: { width: number; height: number };
}

interface HeadedInput {
  headed?: boolean | undefined;
}

interface HeadedEnv {
  MSD_HEADLESS?: string | undefined;
}

/**
 * Resolver for the headed option.
 *
 * Precedence (highest to lowest):
 * 1. Per-call parameter `headed: boolean`
 * 2. Env var `MSD_HEADLESS=1` (=> headed false, opt-in to headless)
 * 3. Default `true` (VISIBLE browser)
 *
 * NON-NEGOTIABLE RULE: the default is `true`. A required unit test hard-blocks CI
 * if the default changes. See docs/SECURITY.md.
 *
 * Extracted as a pure function so it can be tested without spawning a real browser.
 */
export function resolveHeaded(input: HeadedInput, env: HeadedEnv): boolean {
  if (input.headed !== undefined) return input.headed;
  if (env.MSD_HEADLESS === '1' || env.MSD_HEADLESS === 'true') return false;
  return true;
}

let active: ActiveContext | null = null;

function launcherFor(browser: BrowserName) {
  switch (browser) {
    case 'chromium': return chromium;
    case 'firefox':  return firefox;
    case 'webkit':   return webkit;
  }
}

export interface OpenInput {
  browser: BrowserName;
  profile?: string | undefined;
  headed?: boolean | undefined;
  viewport?: { width: number; height: number } | undefined;
}

export interface OpenResult {
  browser: BrowserName;
  profile: string;
  headed: boolean;
  viewport: { width: number; height: number };
  openedAt: string;
}

export async function open(input: OpenInput): Promise<OpenResult> {
  // Close any previous context.
  if (active !== null) {
    await close();
  }
  const profile = input.profile ?? 'default';
  const meta = ensureProfile(input.browser, profile);
  const dir = resolveProfilePath(input.browser, meta.name);
  const headed = resolveHeaded({ headed: input.headed }, process.env as HeadedEnv);
  const viewport = input.viewport ?? { width: 1440, height: 900 };
  const launcher = launcherFor(input.browser);
  try {
    const context = await launcher.launchPersistentContext(dir, {
      headless: !headed,
      viewport,
    });
    // launchPersistentContext returns a context with at least one empty page.
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] as Page : await context.newPage();
    const openedAt = new Date().toISOString();
    active = {
      browser: input.browser,
      profile: meta.name,
      context,
      page,
      openedAt,
      headed,
      viewport,
    };
    return {
      browser: input.browser,
      profile: meta.name,
      headed,
      viewport,
      openedAt,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // On Linux without a display headed will not start. Suggest opt-in headless.
    if (headed && /Missing X server|DISPLAY|Xvfb/i.test(msg)) {
      throw new Error(
        `DISPLAY_UNAVAILABLE: cannot open headed browser on this system. ` +
        `Set env var MSD_HEADLESS=1 or pass headed:false to browser_open. Root cause: ${msg}`
      );
    }
    throw new Error(`BROWSER_LAUNCH_FAILED: ${msg}`);
  }
}

export async function close(): Promise<void> {
  if (active === null) return;
  const { browser, profile, context } = active;
  try {
    await context.close();
  } catch {
    // Silent: if the context was already dead, we do not care.
  }
  markLastUsed(browser, profile);
  active = null;
}

export function getActive(): ActiveContext | null {
  return active;
}

export function requireActive(): ActiveContext {
  if (active === null) {
    throw new Error('NO_ACTIVE_CONTEXT: call browser_open first');
  }
  return active;
}

// Test-only: reset state without touching real browsers.
export function _resetForTest(): void {
  active = null;
}
