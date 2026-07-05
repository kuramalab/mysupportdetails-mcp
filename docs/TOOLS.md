# MCP Tools Schema

Schema completo di tutti i tool esposti da `@kuramalab-io/mysupportdetails-mcp`. Compatibile con Claude Code, Cursor, Cline.

## Convenzioni

- Tutti gli input validati via Zod schema
- Errori restituiti come `McpError` con code + message parseable dall'agente
- Path filesystem sempre resolved via `os.homedir()` — cross-platform per default
- Timeout default: 30s (override per tool sotto)

## Browser lifecycle

### `browser_open`
Apre un browser + profilo. Se un contesto è già attivo, viene chiuso.

**Input**:
```typescript
{
  browser: "chromium" | "firefox" | "webkit",
  profile?: string,           // default "default"
  headed?: boolean,           // default true (browser VISIBILE) - vedi nota sotto
  viewport?: { width: number, height: number }  // default 1440x900
}
```

**Nota `headed`**: il default `true` significa **finestra browser sempre visibile**. Per invertire globalmente serve env var esplicita `MSD_HEADLESS=1` al lancio del server MCP. Il parametro per-call ha precedenza sull'env var. Zero build-flag: nessun fork puo' invertire il default a livello di build.

**Output**: `{ contextId: string, browser: string, profile: string, viewport: {...}, headed: boolean }`

**Errori**:
- `INVALID_PROFILE_NAME` — nome contiene caratteri illegali
- `BROWSER_LAUNCH_FAILED` — Playwright non riesce ad avviare (dep mancante ecc.)
- `DISPLAY_UNAVAILABLE` — richiesto `headed: true` ma non c'e' display (es. Linux server senza X). Suggerisce come opt-in a headless (env var o parametro per-call).

### `browser_close`
Chiude il contesto attivo. Salva metadata `last_used`.

**Input**: `{}`

**Output**: `{ closed: true }`

## Navigation

### `browser_navigate`
GET su URL. Attende `load` event (configurabile).

**Input**:
```typescript
{
  url: string,
  wait_until?: "load" | "domcontentloaded" | "networkidle",  // default "load"
  timeout_ms?: number  // default 30000
}
```

**Output**: `{ url: string, status: number, title: string }`

## Perception

### `browser_snapshot`
Restituisce l'accessibility tree della pagina in formato struttura-per-agente (compatibile con `@playwright/mcp` convention: ogni elemento ha `ref` univoco richiamabile da tool successivi).

**Input**: `{}`

**Output**: `{ tree: YamlSnapshot }` dove YamlSnapshot è la stessa struttura testuale usata da Playwright MCP ufficiale.

### `browser_screenshot`
Screenshot PNG.

**Input**:
```typescript
{
  full_page?: boolean,  // default false
  path?: string,  // se assente, base64 nella response
  quality?: number  // 1-100, solo jpeg
}
```

**Output**: `{ path: string } | { base64: string }`

### `browser_evaluate`
Esegue JS in page context. Ritorna valore serializzato.

**Input**: `{ script: string }`

**Output**: `{ result: unknown }` (JSON-serializable)

**Sicurezza**: script eseguito nel sandbox del browser, non nel processo Node. Cross-origin restrictions applicate.

## Interaction

### `browser_click`
Click su elemento tramite `ref` da precedente snapshot.

**Input**:
```typescript
{
  ref: string,  // es. "e12" da snapshot
  button?: "left" | "right" | "middle"  // default "left"
}
```

**Output**: `{ clicked: true }`

### `browser_type`
Inserisce testo in un elemento (input/textarea/contenteditable).

**Input**:
```typescript
{
  ref: string,
  text: string,
  submit?: boolean  // se true, invia Enter dopo
}
```

**Output**: `{ typed: true }`

### `browser_press_key`
Simula pressione tasto (Enter, Tab, Escape, ecc.).

**Input**: `{ key: string }`

**Output**: `{ pressed: true }`

### `browser_wait_for`
Attende condizione: selettore visibile / testo presente / timeout.

**Input**:
```typescript
{
  selector?: string,
  text?: string,
  timeout_ms?: number  // default 5000
}
```

**Output**: `{ waited_ms: number }`

## Profile management

### `profile_list`
Lista profili disponibili, filtrabile per browser.

**Input**: `{ browser?: "chromium" | "firefox" | "webkit" }`

**Output**:
```typescript
{
  profiles: Array<{
    name: string,
    browser: string,
    path: string,
    created: string,  // ISO
    last_used: string | null,
    size_mb: number,
    notes: string | null
  }>
}
```

### `profile_create`
Crea profilo vuoto (dir + registry entry).

**Input**:
```typescript
{
  browser: "chromium" | "firefox" | "webkit",
  name: string,  // ^[a-zA-Z0-9._-]{1,64}$
  notes?: string
}
```

**Output**: `{ created: true, path: string }`

**Errori**:
- `PROFILE_EXISTS`
- `INVALID_PROFILE_NAME`

### `profile_delete`
Rimuove profilo (rm -rf dir + registry entry).

**Input**:
```typescript
{
  browser: string,
  name: string
}
```

**Output**: `{ deleted: true }`

**Nota**: se il profilo è il contesto attivo, viene chiuso prima della delete.

### `profile_current`
Info del profilo/browser attivo (se contesto aperto).

**Input**: `{}`

**Output**:
```typescript
{
  active: boolean,
  browser?: string,
  profile?: string,
  url_current?: string,
  opened_at?: string
}
```

## Esempi di uso combinato

### Prendi info device via mysupportdetails
```
1. browser_open({ browser: "chromium", profile: "default" })
2. browser_navigate({ url: "https://www.mysupportdetails.com/" })
3. browser_wait_for({ selector: "#lblIp", timeout_ms: 5000 })
4. browser_evaluate({
     script: `Object.fromEntries(
       ['lblOs','lblBrowser','lblIp','lblIsp','lblScreenresolution',
        'lblBrowserResolution','lblColourDepth','lblJavascript','lblCookies',
        'lblTimezone'].map(id => [id, document.getElementById(id)?.textContent?.trim()])
     )`
   })
5. browser_close()
```

Restituisce JSON con tutti i valori device info.

### Cross-browser check
```
for browser in ['chromium', 'firefox', 'webkit']:
  browser_open({ browser, profile: `test-${browser}` })
  browser_navigate({ url: "https://www.mysupportdetails.com/" })
  screenshot = browser_screenshot({ full_page: true, path: `/tmp/${browser}.png` })
  info = browser_evaluate({ script: '...' })
  browser_close()
```

### Fingerprint diff tra profili
```
1. browser_open({ browser: "chromium", profile: "clean" })
2. browser_navigate({ url: "https://www.mysupportdetails.com/web/browser-fingerprinting-test-check-your-privacy-exposure/" })
3. browser_snapshot() -> analizza fingerprint score
4. browser_close()
5. browser_open({ browser: "chromium", profile: "with-ublock" })  // profilo con extension
6. browser_navigate({ url: "..." })
7. browser_snapshot() -> confronta fingerprint score
8. browser_close()
```

## Estensioni non-MVP

Sono candidate per v2 ma non implementate in v1:

- `browser_new_tab` — apre tab in stesso contesto
- `browser_close_tab` — chiude tab specifica
- `browser_list_tabs`
- `browser_download` — trigger + salva file
- `browser_upload` — file input
- `browser_network_intercept` — mock/log risposte HTTP
- `browser_console_messages` — leggi console log della pagina
