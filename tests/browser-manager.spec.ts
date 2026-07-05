import { describe, it, expect } from 'vitest';
import { resolveHeaded } from '../src/browser-manager.js';

// NON-NEGOTIABLE RULE: the browser must start VISIBLE by default.
// A silent switch to headless-by-default would make it invisible to the user
// what the AI agents are doing on their authenticated session. This test hard-blocks
// CI if someone flips the default. See docs/SECURITY.md, section
// "Browser ALWAYS visible by default".
describe('resolveHeaded (NON-NEGOTIABLE RULE)', () => {
  it('default must be true (VISIBLE browser)', () => {
    expect(resolveHeaded({}, {})).toBe(true);
  });

  it('MSD_HEADLESS=1 makes it headless', () => {
    expect(resolveHeaded({}, { MSD_HEADLESS: '1' })).toBe(false);
  });

  it('MSD_HEADLESS=true makes it headless', () => {
    expect(resolveHeaded({}, { MSD_HEADLESS: 'true' })).toBe(false);
  });

  it('MSD_HEADLESS=0 keeps the default true', () => {
    expect(resolveHeaded({}, { MSD_HEADLESS: '0' })).toBe(true);
  });

  it('per-call parameter headed:false overrides env', () => {
    expect(resolveHeaded({ headed: false }, { MSD_HEADLESS: '0' })).toBe(false);
  });

  it('per-call parameter headed:true overrides MSD_HEADLESS=1', () => {
    // The per-call parameter ALWAYS has the highest precedence.
    expect(resolveHeaded({ headed: true }, { MSD_HEADLESS: '1' })).toBe(true);
  });

  it('unrecognized MSD_HEADLESS (yes/on/random) keeps the default true', () => {
    expect(resolveHeaded({}, { MSD_HEADLESS: 'yes' })).toBe(true);
    expect(resolveHeaded({}, { MSD_HEADLESS: 'on' })).toBe(true);
  });
});
