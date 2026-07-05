import { describe, it, expect } from 'vitest';
import { resolveHeaded } from '../src/browser-manager.js';

// REGOLA NON NEGOZIABILE: il browser deve partire VISIBILE per default.
// Un cambio silenzioso a headless-by-default renderebbe invisibile all'utente
// cosa fanno gli agenti AI sulla sua sessione autenticata. Questo test hard-blocka
// la CI se qualcuno inverte il default. Vedi docs/SECURITY.md sezione
// "Browser SEMPRE visibile di default".
describe('resolveHeaded (REGOLA NON NEGOZIABILE)', () => {
  it('default deve essere true (browser VISIBILE)', () => {
    expect(resolveHeaded({}, {})).toBe(true);
  });

  it('MSD_HEADLESS=1 rende headless', () => {
    expect(resolveHeaded({}, { MSD_HEADLESS: '1' })).toBe(false);
  });

  it('MSD_HEADLESS=true rende headless', () => {
    expect(resolveHeaded({}, { MSD_HEADLESS: 'true' })).toBe(false);
  });

  it('MSD_HEADLESS=0 mantiene default true', () => {
    expect(resolveHeaded({}, { MSD_HEADLESS: '0' })).toBe(true);
  });

  it('parametro per-call headed:false sovrascrive env', () => {
    expect(resolveHeaded({ headed: false }, { MSD_HEADLESS: '0' })).toBe(false);
  });

  it('parametro per-call headed:true sovrascrive MSD_HEADLESS=1', () => {
    // Il parametro per-call ha SEMPRE la precedenza massima.
    expect(resolveHeaded({ headed: true }, { MSD_HEADLESS: '1' })).toBe(true);
  });

  it('MSD_HEADLESS non riconosciuto (yes/on/random) mantiene default true', () => {
    expect(resolveHeaded({}, { MSD_HEADLESS: 'yes' })).toBe(true);
    expect(resolveHeaded({}, { MSD_HEADLESS: 'on' })).toBe(true);
  });
});
