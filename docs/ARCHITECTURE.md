# Architecture

## Tech stack

| Component | Choice | Reason |
|---|---|---|
| Language | TypeScript strict | Type-safe MCP schemas, native Playwright ecosystem |
| Runtime | Node.js 18+ | Compatible with Claude Code, Cursor, Cline. Playwright supports 18/20/22 |
| MCP SDK | `@modelcontextprotocol/sdk` | Official Anthropic SDK, stdio transport for Claude Code |
| Browser automation | `playwright` | Cross-browser (Chromium/Firefox/WebKit), cross-platform, actively maintained |
| Package registry | public npm | `@kuramalab` scope, install via npx |
| Build | tsc + esbuild | Single-file output `dist/server.mjs` for fast startup |
| Test | vitest | Playwright ecosystem + fast + TS-native |

## Logical diagram

```
+-------------------+
| Claude Code / IDE |
|  (AI agent)       |
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
   +--------->| Playwright |   | ~/.msd/         |
             +-----+------+   | profiles/       |
                   |          | profiles.json   |
                   v          +-----------------+
             +-----+------+
             | Chrome/FF/ |
             | WebKit     |
             | (headed)   |
             +------------+
```

## Core components

### `src/server.ts` ... entry point
- Initializes the SDK `McpServer` with stdio transport
- Registers every tool from the `tools/` directory
- Handles lifecycle: SIGTERM closes any open browser context and saves profile metadata
- Standardized exit codes for Claude Code diagnostics

### `src/browser-manager.ts`
- Singleton state: `currentContext: BrowserContext | null`, `currentBrowser: BrowserType | null`
- `open(browser, profile)`:
  1. Resolve profile path via `profile-store.resolvePath(browser, profile)`
  2. If the profile does not exist, create the directory and register metadata
  3. `chromium.launchPersistentContext(dir, opts)` (or firefox/webkit)
  4. Save the ref in state
- `close()`: close the context, reset state, update `last_used` in metadata
- All other tools (navigate, click, etc.) read `currentContext.pages()[0]`

### `src/profile-store.ts`
- Root path: `${os.homedir()}/.mysupportdetails-mcp/`
- Browser path: `${root}/profiles/${browser}/`
- Profile path: `${root}/profiles/${browser}/${profileName}/`
- Registry: `${root}/profiles.json` with this shape:

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
- `list(browser?)` filters the registry
- `create(browser, name)` creates an empty dir and appends the registry
- `delete(browser, name)` rm -rf the dir and removes the registry entry
- `resolvePath(browser, name)` returns a safe absolute path (no path traversal)

### `src/tools/*.ts`
Each tool exports:

```typescript
export const tool: McpTool = {
  name: 'browser_open',
  description: '...',
  inputSchema: z.object({...}),
  handler: async (input, ctx) => {...}
}
```

Central registration in `server.ts` via `import * as tools`.

## Design decisions

### Why stdio transport instead of HTTP/WebSocket
Claude Code, Cursor, and Cline launch the MCP server as a subprocess with JSON-RPC over stdin/stdout. Zero networking, zero open ports, zero attack surface. Guaranteed compatibility.

### Why the browser is headed by default (non-negotiable rule)
KuramaLab cross-tool rule: **the browser is always visible**. The agent sees what you see, you see in real time what the agent is doing. Debug + immediate trust + security first (no silent execution).

Implementation:

- In the `browser_open` tool schema: `headed: boolean` with a hardcoded Zod-schema default of `true` (not via env, so the signature exposes it).
- The env var `MSD_HEADLESS=1` can invert the default globally (explicit opt-in for CI/batch).
- The per-call parameter `headed: false` overrides the env var for a single call.
- **There is no build-time flag to invert the default.** Anyone who wants "always headless" must set the env var, there is no compile-time knob. This prevents silent forks that flip the behavior.

Precedence: tool-call parameter > env var > default (`true`).

Required unit test: `browserManager.resolveHeaded({headed: undefined}, {env: {}}) === true` ... if this test fails, CI blocks the merge.

### Why profiles live in `~/.msd/` instead of inside the repo
- They survive `npm uninstall`
- Cross-project (the same profile can be used from different projects)
- XDG-friendly convention
- Easy backup/restore separate from the code

### Why a single global context instead of multi-context
Simpler state model. A tool call acts on the active context. Switching profile = close + open. If concurrent multi-context is ever needed, we can add an opt-in `contextId` parameter without breaking the API.

### Cross-platform: known gotchas

**macOS**
- First run: Gatekeeper may ask for permissions for the Playwright browsers. Unblock via System Settings > Privacy & Security.
- Absolute paths resolved via `os.homedir()` ... work identically.
- Chromium Playwright is bundled arm64-native on Apple Silicon.

**Linux**
- System dep for WebKit: libwebkit2gtk-4.1-0 (Ubuntu/Debian). Playwright ships `npx playwright install-deps` for auto-install.
- Firefox on Wayland: add `--enable-features=UseOzonePlatform --ozone-platform=wayland` on a Wayland session.
- Headless works without an X server. Headed requires X or Wayland.

**Windows**
- Backslash paths handled by Node's `path` module automatically.
- WSL2: Playwright browsers may require `wsl --update` for audio/video.
- Antivirus may flag the bundled Chromium ... whitelist `%USERPROFILE%\.cache\ms-playwright`.

### Why TypeScript strict
- `noImplicitAny`, `strictNullChecks`: reduce runtime errors on the agent side (schema violations become rare)
- Type-safe output ... the MCP SDK validates input via zod schemas ... the agent receives clear errors
- Maximum IDE support for external contributors

## Testing strategy

- **Unit** (vitest): `profile-store` (mock filesystem via memfs), `browser-manager` state transitions
- **Integration** (playwright test runner): full flow against `https://example.com` (safe, stable domain)
- **E2E smoke** (post-publish): install `npx @kuramalab-io/mysupportdetails-mcp@latest` in Docker + navigate mysupportdetails + verify JSON output
- CI matrix: `ubuntu-latest`, `macos-latest`, `windows-latest` x Node 18/20/22

## Build & distribution

- `pnpm build` -> `dist/server.mjs` (single ESM bundle, ~2 MB with the SDK inlined)
- `pnpm publish --access public` -> public npm registry
- Versioning: strict semver, automatic changelog via changesets
- Parallel GitHub release + npm tag via GitHub Actions

## Future extensions (not in the MVP)

- **Encryption at-rest** (v2): `--encrypt` flag, AES-256-GCM, key in the OS keychain (macOS Keychain, Linux Secret Service, Windows Credential Manager)
- **Profile export/import** (v2): signed tarball for portability across machines
- **Concurrent multi-context** (v3): `browser_open` tool with opt-in `contextId`
- **Remote transport** (v3): HTTP/WebSocket to run the MCP server remotely
