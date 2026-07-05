# @kuramalab-io/mysupportdetails-mcp

> **MCP server specializzato per QA, Quality Assurance e test automation** — agente AI che pilota browser reali (Chromium / Firefox / WebKit) e profili persistenti multipli, con **runtime switching** tra profili e browser senza restart.

Perfetto per team QA che vogliono automatizzare test cross-browser, cross-account, regressione visiva, verifica localizzazione, audit di privacy/fingerprint. Compatibile con Claude Code, Cursor, Cline e qualsiasi client MCP-standard.

Progettato con **[MySupportDetails.com](https://www.mysupportdetails.com/)** come showcase naturale per verificare cosa vede il browser/profilo in ogni combinazione.

## Casi d'uso QA / Testing (primari)

- **Regression testing cross-browser**: stesso flusso in Chromium, Firefox e WebKit → confronto DOM/screenshot automatico
- **Testing multi-account**: profilo `free-user`, profilo `premium-user`, profilo `admin` → l'agente verifica che ogni ruolo veda cio' che deve
- **Localization QA**: profilo per lingua/paese (cookie `msd_lang`, timezone, geo), l'agente verifica title/label/prezzi tradotti
- **Onboarding e flussi first-time**: profilo pulito ogni run → repro affidabile "cosa vede un utente nuovo"
- **Privacy/fingerprint audit**: profilo con extension privacy vs profilo vergine → l'agente misura la differenza
- **Cookie banner / consent flow**: profilo pre-consenso vs post-consenso → verifica che tracker non partano prima
- **A/B testing manuale**: profili con feature flag diversi → l'agente confronta due varianti UX in un solo prompt

## Casi d'uso adiacenti

- Security research (headers, CSP, response leakage)
- RPA (form filling ricorrenti, check stato ordini)
- Content scraping etico contro il tuo dominio

Sviluppato da [KuramaLab](https://github.com/KuramaLab). MIT license. Multi-piattaforma: **macOS, Linux, Windows**.

Source: [github.com/KuramaLab/mysupportdetails-mcp](https://github.com/KuramaLab/mysupportdetails-mcp) — npm: [`@kuramalab-io/mysupportdetails-mcp`](https://www.npmjs.com/package/@kuramalab-io/mysupportdetails-mcp).

## Comportamento di default: browser VISIBILE

`mysupportdetails-mcp` apre sempre il browser **in modalita' headed (finestra visibile)**. Questa non e' una configurazione da attivare, e' il default e va tenuto cosi'.

Motivo: quando l'agente AI naviga per conto tuo, tu devi **vedere in tempo reale** cosa sta facendo. Zero silent execution. Se qualcosa va storto (login su sito sbagliato, click imprevisto, popup malevolo) te ne accorgi subito e killi.

Se ti serve headless (CI, batch, server senza display) devi opt-in esplicitamente in uno dei modi seguenti:

- **Env var globale**: `MSD_HEADLESS=1` prima del comando (vale per tutte le chiamate dello stesso server).
- **Parametro per-call**: `browser_open({..., headed: false})` nel singolo tool call.

Priorita': parametro per-call sovrascrive env var. Se ne' l'uno ne' l'altro sono settati -> headed. Sempre.

Questa scelta e' documentata sia in [SECURITY.md](docs/SECURITY.md) (perche' headed e' anche una feature di security) sia in [ARCHITECTURE.md](docs/ARCHITECTURE.md) (perche' non e' modificabile a livello di build).

## Client MCP compatibili

`mysupportdetails-mcp` implementa Model Context Protocol standard con transport **stdio JSON-RPC**. Funziona con qualsiasi client MCP-compatibile senza modifiche:

| Client | Config file | Note |
|---|---|---|
| Claude Code (CLI) | auto via `claude mcp add` | Comando ufficiale sotto |
| Claude Desktop | `claude_desktop_config.json` | Stesso schema `mcpServers` |
| Cursor | `~/.cursor/mcp_settings.json` | |
| Cline (VSCode) | `cline_mcp_settings.json` | |
| Continue.dev | `~/.continue/mcp.json` | |
| Zed editor | `~/.config/zed/settings.json` | MCP support 2026+ |
| Cody (Sourcegraph) | Cody MCP settings | |
| Hermes / OpenClaw / LLM con wrapper MCP | vendor-specific | Purche' parlino MCP stdio |
| n8n / Zapier con connector MCP | node subprocess | Esegue mysupportdetails-mcp come CLI |

Nessuna dipendenza vendor-lock: zero API key cloud, zero binding a modello LLM. Se il client parla MCP, funziona.

## Perché serve

`@playwright/mcp` ufficiale accetta browser e profilo **come flag statici all'avvio** del server. Se vuoi cambiare browser o profilo al volo devi killare il server e riavviarlo. `mysupportdetails-mcp` risolve questo:

- Runtime switching: cambio browser o profilo tra un tool call e l'altro, zero restart
- Profili named con metadata (nome, ultimo uso, dimensione, browser target)
- Confronto side-by-side tra profili nello stesso prompt
- Tool CRUD sui profili invocabili dall'agente

## Installazione

Con Claude Code:

```
claude mcp add -s user playwright -- npx -y @kuramalab-io/mysupportdetails-mcp@latest
```

Con Cursor / Cline: aggiungi al file `mcp_settings.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@kuramalab-io/mysupportdetails-mcp@latest"]
    }
  }
}
```

La prima esecuzione scarica i browser Playwright (~300 MB, solo una volta).

## Quickstart in 30 secondi

Nella tua sessione Claude Code / Cursor:

```
Apri Chromium con profilo "test-user-1", vai su
https://www.mysupportdetails.com/, aspetta 3 secondi,
restituisci JSON con browser, OS, IP, ISP, screen resolution.

Poi fai la stessa cosa con Firefox profilo "test-user-2" e
confronta le due risposte.
```

L'agente chiama in ordine:
- `browser_open({browser: "chromium", profile: "test-user-1"})`
- `browser_navigate({url: "https://www.mysupportdetails.com/"})`
- `browser_snapshot()`
- `browser_close()`
- `browser_open({browser: "firefox", profile: "test-user-2"})`
- (ripete)

E ti restituisce l'analisi comparata.

## Requisiti sistema

| Requisito | Versione |
|---|---|
| Node.js | 18.x, 20.x, 22.x |
| Sistema operativo | macOS 11+ / Linux (glibc 2.31+) / Windows 10+ |
| RAM | 2 GB liberi (Playwright + browser) |
| Disco | 500 MB (browser Playwright + profili) |
| Rete | necessaria alla prima install (download browser) |

Playwright installa **le sue versioni di Chromium/Firefox/WebKit** dentro la cache Node (~/.cache/ms-playwright). Non tocca i browser installati sul sistema.

## Path profili per OS

I profili vivono in `~/.msd/profiles/{browser}/{profile-name}/`:

- **macOS**: `/Users/tuoutente/.mysupportdetails-mcp/profiles/chromium/test-user-1/`
- **Linux**: `/home/tuoutente/.mysupportdetails-mcp/profiles/firefox/personale/`
- **Windows**: `C:\Users\tuoutente\.msd\profiles\webkit\lavoro\`

Path risolto via `os.homedir()` di Node — funziona identico ovunque.

Un file `~/.msd/profiles.json` mantiene il registro con metadati (nome, browser, created, last_used, size_mb, note).

## Sicurezza dei profili

I profili contengono cookie, localStorage, IndexedDB, cache — **inclusi token di login attivi**. Sono salvati in chiaro sul disco (stesso comportamento del profilo Chrome di sistema).

**Non usare mysupportdetails-mcp su macchine condivise** senza cifratura del disco (FileVault macOS, BitLocker Windows, LUKS Linux). Vedi [SECURITY.md](docs/SECURITY.md) per dettagli.

## Tool esposti (v0.1.0)

Vedi [TOOLS.md](docs/TOOLS.md) per schema completo.

- `browser_open` — apre browser + profilo
- `browser_close` — chiude contesto attivo
- `browser_navigate` — GET URL
- `browser_snapshot` — DOM accessibility tree (agente-friendly)
- `browser_click` — click su ref elemento
- `browser_type` — inserisce testo
- `browser_evaluate` — esegue JS in pagina
- `browser_screenshot` — salva PNG
- `profile_list` — lista profili
- `profile_create` — nuovo profilo vuoto
- `profile_delete` — rimuove profilo
- `profile_current` — info profilo attivo

## Esempi

Vedi cartella `examples/`:

- `multi-account-test.md` — test cross-account (2 login diversi, stesso sito)
- `cross-browser-audit.md` — apre stesso sito in Chromium/Firefox/WebKit, confronta rendering
- `fingerprint-diff.md` — apre mysupportdetails.com con profili senza/con extension privacy, confronta fingerprint

## Confronto con @playwright/mcp

| Feature | @playwright/mcp ufficiale | @kuramalab-io/mysupportdetails-mcp |
|---|---|---|
| Chromium / Firefox / WebKit | ✓ flag `--browser` (statico) | ✓ runtime switching |
| Profilo persistente | ✓ flag `--user-data-dir` (statico) | ✓ runtime switching |
| Profili multipli named | ✗ (uno per server) | ✓ N con metadata |
| CRUD profili dall'agente | ✗ | ✓ `profile_*` tool |
| Cross-profile in un prompt | ✗ | ✓ first-class |
| Encryption at-rest | ✗ | roadmap v2 (opt-in) |
| Cross-platform | ✓ | ✓ |

## Roadmap

Vedi [ROADMAP.md](docs/ROADMAP.md).

- **v0.1.0** MVP: multi-browser + un profilo default per browser
- **v0.2.0** profili multipli named + CRUD
- **v0.3.0** runtime switching senza restart contesto
- **v0.4.0** esempi + doc completa
- **v1.0.0** publish npm public + Product Hunt / HN launch

## Contribuire

Issue e PR benvenute. Vedi [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT © 2026 KuramaLab
