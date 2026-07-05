# MCP Tools Schema

Full schema of every tool exposed by `@kuramalab-io/mysupportdetails-mcp`. Compatible with Claude Code, Cursor, Cline.

## Conventions

- All inputs validated via a Zod schema
- Errors returned as `McpError` with a code + message parseable by the agent
- Filesystem paths always resolved via `os.homedir()` ... cross-platform by default
- Default timeout: 30s (per-tool override below)

## Browser lifecycle

### `browser_open`
Opens a browser + profile. If a context is already active, it is closed first.

**Input**:
```typescript
{
  browser: "chromium" | "firefox" | "webkit",
  profile?: string,           // default "default"
  headed?: boolean,           // default true (VISIBLE browser) - see note below
  viewport?: { width: number, height: number }  // default 1440x900
}
```

**Note on `headed`**: the default `true` means **the browser window is always visible**. To invert it globally you need the explicit env var `MSD_HEADLESS=1` when launching the MCP server. The per-call parameter takes precedence over the env var. Zero build-flag: no fork can invert the default at build time.

**Output**: `{ contextId: string, browser: string, profile: string, viewport: {...}, headed: boolean }`

**Errors**:
- `INVALID_PROFILE_NAME` ... name contains illegal characters
- `BROWSER_LAUNCH_FAILED` ... Playwright cannot start (missing dep, etc.)
- `DISPLAY_UNAVAILABLE` ... `headed: true` requested but there is no display (e.g. Linux server without X). Suggests how to opt in to headless (env var or per-call parameter).

### `browser_close`
Closes the active context. Saves `last_used` metadata.

**Input**: `{}`

**Output**: `{ closed: true }`

## Navigation

### `browser_navigate`
GET on a URL. Waits for the `load` event (configurable).

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
Returns the page accessibility tree in an agent-friendly structured format (compatible with the `@playwright/mcp` convention: every element has a unique `ref` callable from subsequent tools).

**Input**: `{}`

**Output**: `{ tree: YamlSnapshot }` where YamlSnapshot is the same textual structure used by the official Playwright MCP.

### `browser_screenshot`
PNG screenshot.

**Input**:
```typescript
{
  full_page?: boolean,  // default false
  path?: string,  // if absent, base64 in the response
  quality?: number  // 1-100, jpeg only
}
```

**Output**: `{ path: string } | { base64: string }`

### `browser_evaluate`
Runs JS in the page context. Returns the serialized value.

**Input**: `{ script: string }`

**Output**: `{ result: unknown }` (JSON-serializable)

**Security**: script executed inside the browser sandbox, not in the Node process. Cross-origin restrictions apply.

## Interaction

### `browser_click`
Click an element via a `ref` from a previous snapshot.

**Input**:
```typescript
{
  ref: string,  // e.g. "e12" from snapshot
  button?: "left" | "right" | "middle"  // default "left"
}
```

**Output**: `{ clicked: true }`

### `browser_type`
Type text into an element (input/textarea/contenteditable).

**Input**:
```typescript
{
  ref: string,
  text: string,
  submit?: boolean  // if true, sends Enter afterwards
}
```

**Output**: `{ typed: true }`

### `browser_press_key`
Simulate a keypress (Enter, Tab, Escape, etc.).

**Input**: `{ key: string }`

**Output**: `{ pressed: true }`

### `browser_wait_for`
Wait for a condition: selector visible / text present / timeout.

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
List available profiles, optionally filtered by browser.

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
Create an empty profile (dir + registry entry).

**Input**:
```typescript
{
  browser: "chromium" | "firefox" | "webkit",
  name: string,  // ^[a-zA-Z0-9._-]{1,64}$
  notes?: string
}
```

**Output**: `{ created: true, path: string }`

**Errors**:
- `PROFILE_EXISTS`
- `INVALID_PROFILE_NAME`

### `profile_delete`
Remove a profile (rm -rf dir + registry entry).

**Input**:
```typescript
{
  browser: string,
  name: string
}
```

**Output**: `{ deleted: true }`

**Note**: if the profile is the active context, it is closed before the delete.

### `profile_current`
Info on the active profile/browser (if a context is open).

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

## Combined usage examples

### Read device info via mysupportdetails
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

Returns JSON with every device info value.

### Cross-browser check
```
for browser in ['chromium', 'firefox', 'webkit']:
  browser_open({ browser, profile: `test-${browser}` })
  browser_navigate({ url: "https://www.mysupportdetails.com/" })
  screenshot = browser_screenshot({ full_page: true, path: `/tmp/${browser}.png` })
  info = browser_evaluate({ script: '...' })
  browser_close()
```

### Fingerprint diff between profiles
```
1. browser_open({ browser: "chromium", profile: "clean" })
2. browser_navigate({ url: "https://www.mysupportdetails.com/web/browser-fingerprinting-test-check-your-privacy-exposure/" })
3. browser_snapshot() -> analyze fingerprint score
4. browser_close()
5. browser_open({ browser: "chromium", profile: "with-ublock" })  // profile with extension
6. browser_navigate({ url: "..." })
7. browser_snapshot() -> compare fingerprint score
8. browser_close()
```

## Non-MVP extensions

Candidates for v2 but not implemented in v1:

- `browser_new_tab` ... open a tab in the same context
- `browser_close_tab` ... close a specific tab
- `browser_list_tabs`
- `browser_download` ... trigger + save file
- `browser_upload` ... file input
- `browser_network_intercept` ... mock/log HTTP responses
- `browser_console_messages` ... read the page console log
