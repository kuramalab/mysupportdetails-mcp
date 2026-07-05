import { describe, it, expect } from 'vitest';
import { resolveProfilePath } from '../src/profile-store.js';

// resolveProfilePath is PURE: it validates the name via regex and computes the
// expected path under ~/.msd/profiles/. It does not touch the filesystem, so these
// tests require no setup/teardown and do not pollute the user's home.
describe('resolveProfilePath (path traversal safety)', () => {
  it('accepts valid names', () => {
    expect(() => resolveProfilePath('chromium', 'default')).not.toThrow();
    expect(() => resolveProfilePath('firefox', 'test-user-1')).not.toThrow();
    expect(() => resolveProfilePath('webkit', 'a_b.c-d')).not.toThrow();
  });

  it('rejects path traversal ../', () => {
    expect(() => resolveProfilePath('chromium', '..')).toThrow(/INVALID_PROFILE_NAME/);
    expect(() => resolveProfilePath('chromium', '../etc')).toThrow(/INVALID_PROFILE_NAME/);
  });

  it('rejects separators', () => {
    expect(() => resolveProfilePath('chromium', 'a/b')).toThrow(/INVALID_PROFILE_NAME/);
    expect(() => resolveProfilePath('chromium', 'a\\b')).toThrow(/INVALID_PROFILE_NAME/);
  });

  it('rejects null byte', () => {
    expect(() => resolveProfilePath('chromium', 'a\0b')).toThrow(/INVALID_PROFILE_NAME/);
  });

  it('rejects empty names', () => {
    expect(() => resolveProfilePath('chromium', '')).toThrow(/INVALID_PROFILE_NAME/);
  });

  it('rejects names > 64 chars', () => {
    expect(() => resolveProfilePath('chromium', 'a'.repeat(65))).toThrow(/INVALID_PROFILE_NAME/);
  });

  it('resolved path is under ~/.msd/profiles/', () => {
    const p = resolveProfilePath('chromium', 'valid');
    expect(p).toContain('.msd');
    expect(p).toContain('profiles');
    expect(p).toContain('chromium');
    expect(p).toContain('valid');
  });
});
