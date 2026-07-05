# Roadmap

## v0.1.0 — MVP funzionale (target 5-7 giorni dev)

**Obiettivo**: MCP server installabile via `npx`, apre browser + navigate + snapshot. Zero profili multipli, un profilo default per browser.

- [ ] Scaffold repo: package.json, tsconfig, esbuild config
- [ ] `src/server.ts` con SDK MCP stdio transport
- [ ] `src/browser-manager.ts` versione base (singleton context)
- [ ] Tool `browser_open` (chromium/firefox/webkit, profilo hardcoded "default")
- [ ] Tool `browser_close`
- [ ] Tool `browser_navigate`
- [ ] Tool `browser_snapshot` (accessibility tree)
- [ ] Tool `browser_screenshot` (PNG)
- [ ] README con install `claude mcp add ...`
- [ ] Test unit su browser-manager state machine
- [ ] Test E2E: install locale + navigate mysupportdetails + verify title

Deliverable: `npm publish @kuramalab/mysupportdetails-mcp@0.1.0` funzionante su macOS/Linux/Windows.

## v0.2.0 — Profili named + CRUD (target +3-4 giorni)

- [ ] `src/profile-store.ts` con registry JSON
- [ ] Tool `profile_list`
- [ ] Tool `profile_create`
- [ ] Tool `profile_delete`
- [ ] Tool `profile_current`
- [ ] `browser_open` accetta `profile: string` (default se omesso)
- [ ] Path validation + confinamento (no traversal)
- [ ] Test filesystem via memfs

Deliverable: profili multipli persistenti utilizzabili.

## v0.3.0 — Runtime switching + interazione (target +3-4 giorni)

- [ ] Tool `browser_click` (usa ref da snapshot)
- [ ] Tool `browser_type`
- [ ] Tool `browser_evaluate` (JS in pagina)
- [ ] Tool `browser_wait_for` (timeout + selector)
- [ ] `browser_open` chiama automaticamente close se contesto attivo
- [ ] Session recovery: crash del context → auto-reopen su prossimo tool call

Deliverable: agente puo' fare interazioni complete cross-profile.

## v0.4.0 — Esempi + docs (target +2-3 giorni)

- [ ] `examples/multi-account-test.md` prompt + expected output
- [ ] `examples/cross-browser-audit.md`
- [ ] `examples/fingerprint-diff.md`
- [ ] `docs/TOOLS.md` schema completo
- [ ] `docs/COMPARISON.md` vs @playwright/mcp
- [ ] `docs/TROUBLESHOOTING.md` errori comuni cross-platform
- [ ] Screenshot GIF nel README (Playwright headed che gira contro mysupportdetails)

Deliverable: repo pubblicabile pronto per public launch.

## v1.0.0 — Public launch (target +2 giorni prep + launch day)

- [ ] Semver 1.0.0 = API stabile, breaking change future in v2
- [ ] LICENSE MIT
- [ ] CONTRIBUTING.md
- [ ] CODE_OF_CONDUCT.md
- [ ] GitHub Actions CI (ubuntu/macos/windows × node 18/20/22)
- [ ] Repo public su github.com/KuramaLab/mysupportdetails-mcp
- [ ] npm publish public
- [ ] Article su mysupportdetails.com/it/web/... che punta al repo
- [ ] Launch: Product Hunt + Hacker News Show + r/ClaudeAI + r/LocalLLaMA + Discord Anthropic

Deliverable: v1.0.0 live, articolo attivo, minimo 50 GitHub stars in prima settimana (target realistico).

## Publishing model + separazione personale/azienda

Durante lo sviluppo (v0.1 -> v0.4) mysupportdetails-mcp vive come cartella `mysupportdetails-mcp/`
dentro il mono-repo privato `gitlab.com/michelmarrazzo/mysupportdetails.com`.
Motivo: dev speed, working directory unica, commit atomici cross-progetto
(es. articolo del sito + release npm allineati).

**Pre-launch v1.0.0** viene estratto in repo GitHub public separato,
mantenendo la history dei soli commit che toccano `mysupportdetails-mcp/`:

```
# in un clone del mono-repo (mai sul repo di lavoro)
git filter-repo --path mysupportdetails-mcp/ --path-rename mysupportdetails-mcp/:
git remote add origin git@github.com:KuramaLab/mysupportdetails-mcp.git
git push -u origin main
```

Da quel momento in poi:

- **`gitlab.com/michelmarrazzo/mysupportdetails.com`** = codebase personale
  (sito PHP + storia dev mysupportdetails-mcp fino all'estrazione). Rimane privato.
- **`github.com/KuramaLab/mysupportdetails-mcp`** = prodotto azienda public. Da qui in poi
  ogni sviluppo mysupportdetails-mcp avviene direttamente sul repo GitHub, non piu' nel
  mono-repo GitLab.
- **npm registry `@kuramalab`** scope org (non profilo personale).
- **Articoli sito mysupportdetails** puntano al repo GitHub (backlink SEO,
  authority signal).

Questa separazione garantisce che:

- Nessun asset personale (secrets, config, monetization) finisca in un repo
  pubblico per errore.
- Il brand KuramaLab e' pulitamente separato dall'identita' personale
  michelmarrazzo agli occhi della community open source.
- Contributori esterni al progetto vedono solo mysupportdetails-mcp, non tutto il mono-repo.

## v2.0.0 — Encryption at-rest opt-in (target Q4 2026)

- [ ] Flag `--encrypt` in server startup
- [ ] AES-256-GCM su tutti i file del profilo
- [ ] Chiave master in OS keychain:
  - macOS: `keytar` (Keychain Services)
  - Linux: `keytar` (libsecret)
  - Windows: `keytar` (DPAPI Credential Manager)
- [ ] Fallback password prompt se keychain non disponibile
- [ ] Migration script v0.x -> v2 (encrypt profili esistenti opt-in)
- [ ] Test cross-platform su tre OS
- [ ] Doc update SECURITY.md

Deliverable: mysupportdetails-mcp utilizzabile per casi security-sensitive.

## v3.0.0 — Multi-context + remote transport (long-term)

- [ ] Tool `browser_open` accetta `contextId` opt-in
- [ ] `browser_switch_context({contextId})` per attivare uno specifico
- [ ] Refactor state manager per lifecycle N contesti
- [ ] Optional HTTP/WebSocket transport per MCP server remoto
- [ ] Auth token + rate limit per transport remoto
- [ ] Docker image per deploy MCP server headless in cluster

Deliverable: casi enterprise cross-team + testing farm.

## Metriche di successo

- **v1.0.0 week 1**: 50 GitHub stars, 500 npm downloads
- **v1.0.0 month 1**: 200 stars, 2000 downloads, 3 issue esterne
- **v1.0.0 month 3**: 500 stars, 10k downloads, 5 contributori esterni
- **v2.0.0 month 6**: 1k stars, adozione documentata da almeno 2 team enterprise

## Non-goals (esplicitamente FUORI scope)

- **Browser diversi da Chromium/Firefox/WebKit** (es. Brave, Opera, Edge separati). Chi vuole Brave usa Chromium con l'extension Brave nel profilo.
- **Mobile emulation via device manager** (usa DevTools mobile emulation via browser_evaluate se serve).
- **Screen recording video**: fuori dominio MCP. Chi vuole video usa Playwright direttamente in test.
- **Assertions framework**: mysupportdetails-mcp è un provider di capabilities, non un test runner.
- **UI dashboard web**: agente ha già accesso, non serve GUI aggiuntiva.
