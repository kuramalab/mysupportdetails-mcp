# Changelog

All notable changes to `@kuramalab-io/mysupportdetails-mcp`.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning 2.0.0](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-07-05

Initial MVP release.

### Added
- MCP server over stdio transport (`@modelcontextprotocol/sdk` v1).
- Singleton browser manager with Chromium, Firefox, and WebKit support via Playwright.
- Persistent profile store in `~/.msd/profiles/{browser}/{profile}/` with a JSON registry.
- 12 MCP tools:
  - Browser lifecycle: `browser_open`, `browser_close`.
  - Navigation: `browser_navigate`.
  - Perception: `browser_snapshot` (accessibility tree), `browser_screenshot`, `browser_evaluate`.
  - Interaction: `browser_click`, `browser_type`, `browser_press_key`, `browser_wait_for`.
  - Profile management: `profile_list`, `profile_create`, `profile_delete`, `profile_current`.
- Non-negotiable rule: browser is **headed by default**. Opt-in to headless via env `MSD_HEADLESS=1` or per-call parameter `headed: false`.
- Cross-platform: macOS, Linux, Windows.
- Zod path validation + realpath confinement to block profile-store path traversal.
