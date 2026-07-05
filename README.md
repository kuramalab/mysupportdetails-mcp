# @kuramalab-io/mysupportdetails-mcp

> **MCP server for QA and test automation** ... an AI agent that drives real browsers (Chromium / Firefox / WebKit) and multiple persistent profiles, with **runtime switching** between profiles and browsers without restarting.

Built for QA teams that want to automate cross-browser tests, cross-account flows, visual regression, localization checks, and privacy/fingerprint audits. Works with Claude Code, Cursor, Cline, and any MCP-standard client.

Designed with **[MySupportDetails.com](https://www.mysupportdetails.com/)** as a natural showcase to verify what the browser/profile sees in every combination.

## QA / Testing use cases (primary)

- **Cross-browser regression testing**: same flow in Chromium, Firefox, and WebKit ... automatic DOM/screenshot comparison
- **Multi-account testing**: `free-user` profile, `premium-user` profile, `admin` profile ... the agent verifies that each role sees what it should
- **Localization QA**: one profile per language/country (cookie `msd_lang`, timezone, geo), the agent checks translated titles, labels, and prices
- **Onboarding and first-time flows**: clean profile on every run ... reliable "what a new user sees" repro
- **Privacy/fingerprint audit**: profile with a privacy extension vs a clean profile ... the agent measures the difference
- **Cookie banner / consent flow**: pre-consent profile vs post-consent profile ... verify trackers do not fire before opt-in
- **Manual A/B testing**: profiles with different feature flags ... the agent compares two UX variants in a single prompt

## Adjacent use cases

- Security research (headers, CSP, response leakage)
- RPA (recurring form filling, order status checks)
- Ethical content scraping against your own domain

Built by [KuramaLab](https://github.com/KuramaLab). MIT license. Cross-platform: **macOS, Linux, Windows**.

Source: [github.com/KuramaLab/mysupportdetails-mcp](https://github.com/KuramaLab/mysupportdetails-mcp) ... npm: [`@kuramalab-io/mysupportdetails-mcp`](https://www.npmjs.com/package/@kuramalab-io/mysupportdetails-mcp).

## Default behavior: browser is VISIBLE

`mysupportdetails-mcp` always opens the browser in **headed mode (visible window)**. This is not an option to enable, it is the default and it stays that way.

Reason: when an AI agent browses on your behalf, you need to **see in real time** what it is doing. Zero silent execution. If something goes wrong (login on the wrong site, unexpected click, malicious popup) you notice immediately and can kill it.

If you need headless (CI, batch, headless servers) you must opt in explicitly in one of the following ways:

- **Global env var**: `MSD_HEADLESS=1` before the command (applies to all calls of the same server).
- **Per-call parameter**: `browser_open({..., headed: false})` in a single tool call.

Precedence: per-call parameter overrides env var. If neither is set the browser is headed. Always.

This choice is documented in both [SECURITY.md](docs/SECURITY.md) (headed is also a security feature) and [ARCHITECTURE.md](docs/ARCHITECTURE.md) (it is not build-time configurable).

## Compatible MCP clients

`mysupportdetails-mcp` implements the standard Model Context Protocol with **stdio JSON-RPC** transport. It works with any MCP-compatible client with no changes:

| Client | Config file | Notes |
|---|---|---|
| Claude Code (CLI) | auto via `claude mcp add` | Official command below |
| Claude Desktop | `claude_desktop_config.json` | Same `mcpServers` schema |
| Cursor | `~/.cursor/mcp_settings.json` | |
| Cline (VSCode) | `cline_mcp_settings.json` | |
| Continue.dev | `~/.continue/mcp.json` | |
| Zed editor | `~/.config/zed/settings.json` | MCP support 2026+ |
| Cody (Sourcegraph) | Cody MCP settings | |
| Hermes / OpenClaw / LLMs with MCP wrapper | vendor-specific | As long as they speak MCP stdio |
| n8n / Zapier with MCP connector | node subprocess | Runs mysupportdetails-mcp as a CLI |

No vendor lock-in: zero cloud API keys, zero binding to a specific LLM model. If the client speaks MCP, it works.

## Why it exists

The official `@playwright/mcp` accepts browser and profile **as static flags at server startup**. If you want to switch browser or profile on the fly you must kill the server and restart it. `mysupportdetails-mcp` solves this:

- Runtime switching: change browser or profile between tool calls, zero restart
- Named profiles with metadata (name, last used, size, target browser)
- Side-by-side comparison across profiles in the same prompt
- CRUD tools for profiles callable by the agent

## Installation

With Claude Code:

```
claude mcp add -s user playwright -- npx -y @kuramalab-io/mysupportdetails-mcp@latest
```

With Cursor / Cline: add to your `mcp_settings.json`:

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

The first run downloads the Playwright browsers (~300 MB, one time only).

## 30-second quickstart

In your Claude Code / Cursor session:

```
Open Chromium with profile "test-user-1", go to
https://www.mysupportdetails.com/, wait 3 seconds, and
return JSON with browser, OS, IP, ISP, and screen resolution.

Then do the same with Firefox using profile "test-user-2"
and compare the two responses.
```

The agent calls, in order:
- `browser_open({browser: "chromium", profile: "test-user-1"})`
- `browser_navigate({url: "https://www.mysupportdetails.com/"})`
- `browser_snapshot()`
- `browser_close()`
- `browser_open({browser: "firefox", profile: "test-user-2"})`
- (repeats)

And returns the compared analysis.

## System requirements

| Requirement | Version |
|---|---|
| Node.js | 18.x, 20.x, 22.x |
| Operating system | macOS 11+ / Linux (glibc 2.31+) / Windows 10+ |
| RAM | 2 GB free (Playwright + browser) |
| Disk | 500 MB (Playwright browsers + profiles) |
| Network | required on first install (browser download) |

Playwright installs **its own versions of Chromium/Firefox/WebKit** into the Node cache (~/.cache/ms-playwright). It does not touch browsers installed system-wide.

## Profile paths per OS

Profiles live in `~/.msd/profiles/{browser}/{profile-name}/`:

- **macOS**: `/Users/youruser/.mysupportdetails-mcp/profiles/chromium/test-user-1/`
- **Linux**: `/home/youruser/.mysupportdetails-mcp/profiles/firefox/personal/`
- **Windows**: `C:\Users\youruser\.msd\profiles\webkit\work\`

The path is resolved via Node's `os.homedir()` ... works identically everywhere.

A `~/.msd/profiles.json` file maintains the registry with metadata (name, browser, created, last_used, size_mb, notes).

## Profile security

Profiles contain cookies, localStorage, IndexedDB, and cache ... **including active login tokens**. They are stored unencrypted on disk (same behavior as the system Chrome profile).

**Do not run mysupportdetails-mcp on shared machines** without full-disk encryption (FileVault on macOS, BitLocker on Windows, LUKS on Linux). See [SECURITY.md](docs/SECURITY.md) for details.

## Exposed tools (v0.1.0)

See [TOOLS.md](docs/TOOLS.md) for the full schema.

- `browser_open` ... open browser + profile
- `browser_close` ... close active context
- `browser_navigate` ... GET URL
- `browser_snapshot` ... DOM accessibility tree (agent-friendly)
- `browser_click` ... click on element ref
- `browser_type` ... type text
- `browser_evaluate` ... run JS in the page
- `browser_screenshot` ... save PNG
- `profile_list` ... list profiles
- `profile_create` ... new empty profile
- `profile_delete` ... remove profile
- `profile_current` ... info on the active profile

## Examples

See the `examples/` folder:

- `multi-account-test.md` ... cross-account test (2 different logins, same site)
- `cross-browser-audit.md` ... open the same site in Chromium/Firefox/WebKit, compare rendering
- `fingerprint-diff.md` ... open mysupportdetails.com with profiles with/without a privacy extension, compare fingerprints

## Comparison with @playwright/mcp

| Feature | @playwright/mcp official | @kuramalab-io/mysupportdetails-mcp |
|---|---|---|
| Chromium / Firefox / WebKit | yes, `--browser` flag (static) | yes, runtime switching |
| Persistent profile | yes, `--user-data-dir` flag (static) | yes, runtime switching |
| Multiple named profiles | no (one per server) | yes, N with metadata |
| Profile CRUD from the agent | no | yes, `profile_*` tools |
| Cross-profile in one prompt | no | yes, first-class |
| Encryption at-rest | no | v2 roadmap (opt-in) |
| Cross-platform | yes | yes |

## Roadmap

See [ROADMAP.md](docs/ROADMAP.md).

- **v0.1.0** MVP: multi-browser + one default profile per browser
- **v0.2.0** multiple named profiles + CRUD
- **v0.3.0** runtime switching without restarting the context
- **v0.4.0** examples + full docs
- **v1.0.0** public npm publish + Product Hunt / HN launch

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT (c) 2026 KuramaLab
