import { z } from 'zod';

// Nome profilo: solo caratteri filesystem-safe, max 64 char.
// Impedisce path traversal (../, /, \), null byte injection, nomi troppo lunghi,
// e nomi composti da soli punti (`.`, `..`, `...`) che risolverebbero a
// current-dir / parent-dir sul filesystem.
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

// Ref di un elemento nel snapshot. Il snapshot restituisce ref come "e12",
// il tool successivo (click/type) lo riusa. Formato generico per non
// bloccarci su convenzione specifica.
export const ElementRef = z.string().min(1).max(64);

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; code?: string };
