import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, renameSync, statSync, readdirSync } from 'node:fs';
import { PROFILE_NAME_REGEX, type BrowserName } from './schemas.js';

// Root di tutti i dati locali del server MCP. Path corto per non allungare
// troppo i path Windows (MAX_PATH=260 default) quando si aggiungono le
// sotto-cartelle profilo del browser.
const ROOT = join(homedir(), '.msd');
const PROFILES_ROOT = join(ROOT, 'profiles');
const REGISTRY_PATH = join(ROOT, 'profiles.json');
const REGISTRY_VERSION = 1;

export interface ProfileMeta {
  browser: BrowserName;
  name: string;
  path: string; // relativo a ROOT
  created: string; // ISO
  last_used: string | null;
  size_mb: number;
  notes: string | null;
}

interface Registry {
  version: number;
  profiles: ProfileMeta[];
}

function ensureRoot(): void {
  if (!existsSync(ROOT)) mkdirSync(ROOT, { recursive: true });
  if (!existsSync(PROFILES_ROOT)) mkdirSync(PROFILES_ROOT, { recursive: true });
}

function readRegistry(): Registry {
  ensureRoot();
  if (!existsSync(REGISTRY_PATH)) {
    return { version: REGISTRY_VERSION, profiles: [] };
  }
  try {
    const raw = readFileSync(REGISTRY_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Registry;
    if (typeof parsed !== 'object' || parsed === null || !Array.isArray(parsed.profiles)) {
      return { version: REGISTRY_VERSION, profiles: [] };
    }
    return parsed;
  } catch {
    // Registry corrotto: torniamo lista vuota (i profili on-disk restano intatti).
    return { version: REGISTRY_VERSION, profiles: [] };
  }
}

function writeRegistry(reg: Registry): void {
  ensureRoot();
  // Atomic write: tmp file + rename. Sopravvive a crash mid-write.
  const tmp = `${REGISTRY_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(reg, null, 2), 'utf-8');
  renameSync(tmp, REGISTRY_PATH);
}

function dirSizeBytes(dir: string): number {
  let total = 0;
  const stack: string[] = [dir];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === undefined) break;
    let entries: string[] = [];
    try {
      entries = readdirSync(cur);
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = join(cur, e);
      try {
        const s = statSync(p);
        if (s.isDirectory()) {
          stack.push(p);
        } else if (s.isFile()) {
          total += s.size;
        }
      } catch {
        // Ignora entry inaccessibili.
      }
    }
  }
  return total;
}

/**
 * Risolve il path assoluto di un profilo con confinamento sicuro sotto PROFILES_ROOT.
 * Blocca path traversal (../), nomi con separator, null byte.
 * Throw se il nome non passa la validazione.
 */
export function resolveProfilePath(browser: BrowserName, name: string): string {
  if (!PROFILE_NAME_REGEX.test(name)) {
    throw new Error(`INVALID_PROFILE_NAME: "${name}" does not match ${PROFILE_NAME_REGEX}`);
  }
  const candidate = join(PROFILES_ROOT, browser, name);
  const resolved = resolve(candidate);
  const rootResolved = resolve(PROFILES_ROOT);
  if (!resolved.startsWith(rootResolved + sep) && resolved !== rootResolved) {
    throw new Error(`PATH_TRAVERSAL: resolved path "${resolved}" escapes "${rootResolved}"`);
  }
  return resolved;
}

export function profileExists(browser: BrowserName, name: string): boolean {
  const p = resolveProfilePath(browser, name);
  return existsSync(p) && statSync(p).isDirectory();
}

export function listProfiles(filterBrowser?: BrowserName): ProfileMeta[] {
  const reg = readRegistry();
  const items = filterBrowser === undefined
    ? reg.profiles
    : reg.profiles.filter((p) => p.browser === filterBrowser);
  // Ricalcola size on-the-fly (piu' accurato del cached).
  return items.map((meta) => {
    const abs = join(ROOT, meta.path);
    const bytes = existsSync(abs) ? dirSizeBytes(abs) : 0;
    return { ...meta, size_mb: Math.round((bytes / (1024 * 1024)) * 100) / 100 };
  });
}

export function createProfile(browser: BrowserName, name: string, notes: string | null = null): ProfileMeta {
  const abs = resolveProfilePath(browser, name);
  if (existsSync(abs)) {
    throw new Error(`PROFILE_EXISTS: profile "${browser}/${name}" already exists`);
  }
  mkdirSync(abs, { recursive: true });
  const reg = readRegistry();
  const now = new Date().toISOString();
  const meta: ProfileMeta = {
    browser,
    name,
    path: join('profiles', browser, name),
    created: now,
    last_used: null,
    size_mb: 0,
    notes,
  };
  reg.profiles.push(meta);
  writeRegistry(reg);
  return meta;
}

/**
 * Assicura che un profilo esista. Se non presente, lo crea con default metadata.
 * Usato da browser_open quando l'agente specifica un nome nuovo al volo.
 */
export function ensureProfile(browser: BrowserName, name: string): ProfileMeta {
  if (profileExists(browser, name)) {
    const reg = readRegistry();
    const found = reg.profiles.find((p) => p.browser === browser && p.name === name);
    if (found !== undefined) return found;
    // Dir on-disk esiste ma non registrata: la registriamo ora (recovery).
    const now = new Date().toISOString();
    const meta: ProfileMeta = {
      browser,
      name,
      path: join('profiles', browser, name),
      created: now,
      last_used: null,
      size_mb: 0,
      notes: null,
    };
    reg.profiles.push(meta);
    writeRegistry(reg);
    return meta;
  }
  return createProfile(browser, name, null);
}

export function deleteProfile(browser: BrowserName, name: string): void {
  const abs = resolveProfilePath(browser, name);
  if (existsSync(abs)) {
    rmSync(abs, { recursive: true, force: true });
  }
  const reg = readRegistry();
  reg.profiles = reg.profiles.filter((p) => !(p.browser === browser && p.name === name));
  writeRegistry(reg);
}

export function markLastUsed(browser: BrowserName, name: string): void {
  const reg = readRegistry();
  const p = reg.profiles.find((x) => x.browser === browser && x.name === name);
  if (p !== undefined) {
    p.last_used = new Date().toISOString();
    writeRegistry(reg);
  }
}

// Utili per test e ispezione esterna.
export const _internals = { ROOT, PROFILES_ROOT, REGISTRY_PATH };
