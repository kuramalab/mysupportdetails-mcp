# Architecture

## Stack tecnico

| Componente | Scelta | Motivo |
|---|---|---|
| Linguaggio | TypeScript strict | Type-safe MCP schema, ecosistema Playwright nativo |
| Runtime | Node.js 18+ | Compatibile Claude Code, Cursor, Cline. Playwright supporta 18/20/22 |
| MCP SDK | `@modelcontextprotocol/sdk` | Ufficiale Anthropic, stdio transport per Claude Code |
| Browser automation | `playwright` | Cross-browser (Chromium/Firefox/WebKit), cross-platform, mantenuto |
| Package registry | npm public | Scope `@kuramalab`, install via npx |
| Build | tsc + esbuild | Output single-file `dist/server.mjs` per fast startup |
| Test | vitest | Ecosistema Playwright + fast + TS-native |

## Diagramma logico

```
+-------------------+
| Claude Code / IDE |
|  (agente AI)      |
+---------+---------+
          | stdio (JSON-RPC)
          v
+---------+---------+
|  mysupportdetails-mcp server   |
|   (Node process)  |
+---------+---------+
          |
   +------+---------+---------------+
   |                |               |
   v                v               v
+--+---+       +----+----+    +-----+------+
| tool |       | browser |    | profile    |
| impl |       | manager |    | store      |
+--+---+       +----+----+    +-----+------+
   |                |               |
   |                v               v
   |          +-----+------+   +----+------------+
   +--------->| Playwright |   | ~/.msd/     |
             +-----+------+   | profiles/       |
                   |          | profiles.json   |
                   v          +-----------------+
             +-----+------+
             | Chrome/FF/ |
             | WebKit     |
             | (headed)   |
             +------------+
```

## Componenti core

### `src/server.ts` — entry point
- Inizializza SDK `McpServer` con transport stdio
- Registra tutti i tool dalla dir `tools/`
- Gestisce lifecycle: SIGTERM chiude browser context aperti + salva metadata profili
- Exit code standardizzati per Claude Code diagnostic

### `src/browser-manager.ts`
- Singleton state: `currentContext: BrowserContext | null`, `currentBrowser: BrowserType | null`
- `open(browser, profile)`:
  1. Risolvi path profilo via `profile-store.resolvePath(browser, profile)`
  2. Se profilo non esiste, crea dir + registra metadata
  3. `chromium.launchPersistentContext(dir, opts)` (o firefox/webkit)
  4. Salva ref in state
- `close()`: chiudi contesto, azzera state, aggiorna `last_used` nel metadata
- Tutti gli altri tool (navigate, click, ecc.) leggono `currentContext.pages()[0]`

### `src/profile-store.ts`
- Path root: `${os.homedir()}/.mysupportdetails-mcp/`
- Path browser: `${root}/profiles/${browser}/`
- Path profilo: `${root}/profiles/${browser}/${profileName}/`
- Registry: `${root}/profiles.json` con struttura:

```json
{
  "version": 1,
  "profiles": [
    {
      "browser": "chromium",
      "name": "test-user-1",
      "path": "profiles/chromium/test-user-1",
      "created": "2026-07-05T10:00:00Z",
      "last_used": "2026-07-05T11:30:00Z",
      "size_mb": 45.2,
      "notes": null
    }
  ]
}
```

- Atomic writes: tmp + rename (crash-safe)
- `list(browser?)` filtra registro
- `create(browser, name)` crea dir vuota + append registry
- `delete(browser, name)` rm -rf dir + rimuovi registry entry
- `resolvePath(browser, name)` restituisce path assoluto sicuro (no path traversal)

### `src/tools/*.ts`
Ogni tool esporta:

```typescript
export const tool: McpTool = {
  name: 'browser_open',
  description: '...',
  inputSchema: z.object({...}),
  handler: async (input, ctx) => {...}
}
```

Registrazione centralizzata in `server.ts` via `import * as tools`.

## Design decisions

### Perché stdio transport, non HTTP/WebSocket
Claude Code, Cursor, Cline lanciano l'MCP server come subprocess con stdin/stdout JSON-RPC. Zero networking, zero porte aperte, zero attack surface. Compatibilità garantita.

### Perché browser headed di default (regola non negoziabile)
Regola KuramaLab cross-tool: **browser sempre visibile**. L'agente vede quello che vedi tu, tu vedi in tempo reale quello che fa l'agente. Debug + trust immediato + security first (nessuna esecuzione silent).

Implementazione:

- Nel `browser_open` tool schema: `headed: boolean` con **default `true`** hardcoded in Zod schema (non tramite env, cosi' e' visibile nella firma).
- L'env var `MSD_HEADLESS=1` puo' invertire il default globalmente (opt-in esplicito per CI/batch).
- Il parametro per-call `headed: false` sovrascrive la env var per una singola chiamata.
- **Non esiste una build time flag per invertire il default**. Se qualcuno vuole "sempre headless" deve settare l'env var, non c'e' una configurazione di compilazione. Impedisce fork silenziosi che invertono il comportamento.

Precedenza: parametro tool call > env var > default (`true`).

Test unit obbligatorio: `browserManager.resolveHeaded({headed: undefined}, {env: {}}) === true` — se questo test fallisce, la CI blocca il merge.

### Perché profili in `~/.msd/` invece che dentro il repo
- Sopravvivono a `npm uninstall`
- Cross-project (stesso profilo utilizzabile da progetti diversi)
- Convenzione XDG-friendly
- Facile backup/restore separato dal codice

### Perché single context globale invece di multi-context
Semplifica lo state model. Un tool call agisce sul contesto attivo. Cambio profilo = close + open. Se in futuro serve multi-context concorrenti, si aggiunge parametro `contextId` opt-in senza rompere API.

### Cross-platform: gotcha noti

**macOS**
- Prima esecuzione: Gatekeeper può chiedere permessi per browser Playwright. Sblocco: System Settings > Privacy & Security.
- Path assoluti risolti via `os.homedir()` — funzionano identici.
- Chromium Playwright bundled arm64 su Apple Silicon nativi.

**Linux**
- Dep sistema per WebKit: libwebkit2gtk-4.1-0 (Ubuntu/Debian). Playwright fornisce `npx playwright install-deps` per auto-install.
- Firefox su Wayland: aggiungere `--enable-features=UseOzonePlatform --ozone-platform=wayland` se sessione Wayland.
- Headless funzionante senza X server. Headed richiede X o Wayland.

**Windows**
- Path con backslash gestiti da Node's `path` module automaticamente.
- WSL2: browser Playwright possono richiedere `wsl --update` per audio/video.
- Antivirus può marcare Chromium bundled — whitelist `%USERPROFILE%\.cache\ms-playwright`.

### Perché TypeScript strict
- `noImplicitAny`, `strictNullChecks`: riducono runtime errors sul lato agente (schema violation raro)
- Output type-safe → SDK MCP validate input via zod schemas → agente riceve errori chiari
- IDE support massimo per contributori esterni

## Testing strategy

- **Unit** (vitest): `profile-store` (mock filesystem via memfs), `browser-manager` state transitions
- **Integration** (playwright test runner): full flow contro `https://example.com` (dominio safe, stable)
- **E2E smoke** (post-publish): install `npx @kuramalab/mysupportdetails-mcp@latest` in Docker + navigate mysupportdetails + verify JSON output
- CI matrix: `ubuntu-latest`, `macos-latest`, `windows-latest` × Node 18/20/22

## Build & distribution

- `pnpm build` → `dist/server.mjs` (single ESM bundle, ~2 MB con SDK inline)
- `pnpm publish --access public` → npm registry pubblico
- Versioning: semver strict, changelog automatico via changesets
- GitHub release + npm tag paralleli via GitHub Actions

## Estensioni future non nel MVP

- **Encryption at-rest** (v2): flag `--encrypt`, AES-256-GCM, chiave in OS keychain (macOS Keychain, Linux Secret Service, Windows Credential Manager)
- **Profile export/import** (v2): tarball firmato per portabilità tra macchine
- **Multi-context concorrenti** (v3): tool `browser_open` con `contextId` opt-in
- **Remote transport** (v3): HTTP/WebSocket per esecuzione MCP server remoto
