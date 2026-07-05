import { describe, it, expect } from 'vitest';
import { resolveProfilePath } from '../src/profile-store.js';

// resolveProfilePath e' PURA: valida il nome via regex e calcola il path
// atteso sotto ~/.msd/profiles/. Non tocca il filesystem, quindi questi test
// non richiedono setup/tear-down e non contaminano l'home dell'utente.
describe('resolveProfilePath (path traversal safety)', () => {
  it('accetta nomi validi', () => {
    expect(() => resolveProfilePath('chromium', 'default')).not.toThrow();
    expect(() => resolveProfilePath('firefox', 'test-user-1')).not.toThrow();
    expect(() => resolveProfilePath('webkit', 'a_b.c-d')).not.toThrow();
  });

  it('rifiuta path traversal ../', () => {
    expect(() => resolveProfilePath('chromium', '..')).toThrow(/INVALID_PROFILE_NAME/);
    expect(() => resolveProfilePath('chromium', '../etc')).toThrow(/INVALID_PROFILE_NAME/);
  });

  it('rifiuta separator', () => {
    expect(() => resolveProfilePath('chromium', 'a/b')).toThrow(/INVALID_PROFILE_NAME/);
    expect(() => resolveProfilePath('chromium', 'a\\b')).toThrow(/INVALID_PROFILE_NAME/);
  });

  it('rifiuta null byte', () => {
    expect(() => resolveProfilePath('chromium', 'a\0b')).toThrow(/INVALID_PROFILE_NAME/);
  });

  it('rifiuta nomi vuoti', () => {
    expect(() => resolveProfilePath('chromium', '')).toThrow(/INVALID_PROFILE_NAME/);
  });

  it('rifiuta nomi > 64 char', () => {
    expect(() => resolveProfilePath('chromium', 'a'.repeat(65))).toThrow(/INVALID_PROFILE_NAME/);
  });

  it('path risolto sotto ~/.msd/profiles/', () => {
    const p = resolveProfilePath('chromium', 'valid');
    expect(p).toContain('.msd');
    expect(p).toContain('profiles');
    expect(p).toContain('chromium');
    expect(p).toContain('valid');
  });
});
