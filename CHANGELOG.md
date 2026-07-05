# Changelog

Tutti i cambiamenti rilevanti a `@kuramalab-io/mysupportdetails-mcp`.

Formato: [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/).
Versioning: [Semantic Versioning 2.0.0](https://semver.org/lang/it/).

## [Unreleased]

## [0.1.0] - 2026-07-05

Release iniziale MVP.

### Added
- MCP server con transport stdio (`@modelcontextprotocol/sdk` v1).
- Browser manager singleton con supporto Chromium, Firefox, WebKit via Playwright.
- Profile store persistente in `~/.msd/profiles/{browser}/{profile}/` con registry JSON.
- 12 tool MCP:
  - Browser lifecycle: `browser_open`, `browser_close`.
  - Navigation: `browser_navigate`.
  - Perception: `browser_snapshot` (accessibility tree), `browser_screenshot`, `browser_evaluate`.
  - Interaction: `browser_click`, `browser_type`, `browser_press_key`, `browser_wait_for`.
  - Profile management: `profile_list`, `profile_create`, `profile_delete`, `profile_current`.
- Regola non negoziabile: browser **headed di default**. Opt-in headless via env `MSD_HEADLESS=1` o parametro per-call `headed: false`.
- Cross-platform: macOS, Linux, Windows.
- Path validation Zod + confinamento realpath per bloccare traversal nei profili.
