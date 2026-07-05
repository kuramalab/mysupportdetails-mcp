import { z } from 'zod';

// Profile name: only filesystem-safe characters, max 64 chars.
// Blocks path traversal (../, /, \), null byte injection, names that are too long,
// and dot-only names (`.`, `..`, `...`) that would resolve to
// current-dir / parent-dir on the filesystem.
export const PROFILE_NAME_REGEX = /^(?!\.+$)[a-zA-Z0-9._-]{1,64}$/;

export const BrowserEnum = z.enum(['chromium', 'firefox', 'webkit']);
export type BrowserName = z.infer<typeof BrowserEnum>;

export const ProfileName = z
  .string()
  .regex(PROFILE_NAME_REGEX, 'Profile name must match ^[a-zA-Z0-9._-]{1,64}$');

export const ViewportSchema = z
  .object({
    width: z.number().int().min(100).max(4096),
    height: z.number().int().min(100).max(4096),
  })
  .default({ width: 1440, height: 900 });

// Ref of an element in a snapshot. The snapshot returns refs like "e12",
// the next tool (click/type) reuses them. Generic format so we do not lock
// into a specific convention.
export const ElementRef = z.string().min(1).max(64);

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; code?: string };
