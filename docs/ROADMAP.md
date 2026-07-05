# Roadmap

## v0.1.0 ... functional MVP (target 5-7 dev days)

**Goal**: MCP server installable via `npx`, opens a browser + navigate + snapshot. No multi-profile, one default profile per browser.

- [ ] Scaffold repo: package.json, tsconfig, esbuild config
- [ ] `src/server.ts` with the SDK MCP stdio transport
- [ ] `src/browser-manager.ts` base version (singleton context)
- [ ] Tool `browser_open` (chromium/firefox/webkit, hardcoded profile "default")
- [ ] Tool `browser_close`
- [ ] Tool `browser_navigate`
- [ ] Tool `browser_snapshot` (accessibility tree)
- [ ] Tool `browser_screenshot` (PNG)
- [ ] README with `claude mcp add ...` install
- [ ] Unit tests on the browser-manager state machine
- [ ] E2E test: local install + navigate mysupportdetails + verify title

Deliverable: `npm publish @kuramalab-io/mysupportdetails-mcp@0.1.0` working on macOS/Linux/Windows.

## v0.2.0 ... named profiles + CRUD (target +3-4 days)

- [ ] `src/profile-store.ts` with JSON registry
- [ ] Tool `profile_list`
- [ ] Tool `profile_create`
- [ ] Tool `profile_delete`
- [ ] Tool `profile_current`
- [ ] `browser_open` accepts `profile: string` (default if omitted)
- [ ] Path validation + confinement (no traversal)
- [ ] Filesystem tests via memfs

Deliverable: multiple persistent profiles usable end-to-end.

## v0.3.0 ... runtime switching + interaction (target +3-4 days)

- [ ] Tool `browser_click` (uses ref from snapshot)
- [ ] Tool `browser_type`
- [ ] Tool `browser_evaluate` (JS in page)
- [ ] Tool `browser_wait_for` (timeout + selector)
- [ ] `browser_open` automatically closes an active context
- [ ] Session recovery: context crash -> auto-reopen on the next tool call

Deliverable: the agent can perform full cross-profile interactions.

## v0.4.0 ... examples + docs (target +2-3 days)

- [ ] `examples/multi-account-test.md` prompt + expected output
- [ ] `examples/cross-browser-audit.md`
- [ ] `examples/fingerprint-diff.md`
- [ ] `docs/TOOLS.md` full schema
- [ ] `docs/COMPARISON.md` vs @playwright/mcp
- [ ] `docs/TROUBLESHOOTING.md` common cross-platform errors
- [ ] README screenshot GIF (Playwright headed running against mysupportdetails)

Deliverable: repo publishable, ready for public launch.

## v1.0.0 ... public launch (target +2 days prep + launch day)

- [ ] Semver 1.0.0 = stable API, future breaking changes in v2
- [ ] LICENSE MIT
- [ ] CONTRIBUTING.md
- [ ] CODE_OF_CONDUCT.md
- [ ] GitHub Actions CI (ubuntu/macos/windows x node 18/20/22)
- [ ] Public repo at github.com/KuramaLab/mysupportdetails-mcp
- [ ] npm publish public
- [ ] Article on mysupportdetails.com/en/web/... linking to the repo
- [ ] Launch: Product Hunt + Hacker News Show + r/ClaudeAI + r/LocalLLaMA + Anthropic Discord

Deliverable: v1.0.0 live, article live, minimum 50 GitHub stars in the first week (realistic target).

## Publishing model + personal/company separation

During development (v0.1 -> v0.4) mysupportdetails-mcp lives as a `mysupportdetails-mcp/`
folder inside the private mono-repo `gitlab.com/michelmarrazzo/mysupportdetails.com`.
Reason: dev speed, single working directory, atomic cross-project commits
(e.g. the site article and the npm release land together).

**Pre-launch v1.0.0** it is extracted into a separate public GitHub repo,
keeping only the history of commits that touch `mysupportdetails-mcp/`:

```
# in a clone of the mono-repo (never on the working repo)
git filter-repo --path mysupportdetails-mcp/ --path-rename mysupportdetails-mcp/:
git remote add origin git@github.com:KuramaLab/mysupportdetails-mcp.git
git push -u origin main
```

From that point on:

- **`gitlab.com/michelmarrazzo/mysupportdetails.com`** = personal codebase
  (PHP site + mysupportdetails-mcp dev history up to the extraction). Stays private.
- **`github.com/KuramaLab/mysupportdetails-mcp`** = public company product. All future
  mysupportdetails-mcp development happens directly on the GitHub repo, no longer inside
  the GitLab mono-repo.
- **npm registry `@kuramalab`** org scope (not a personal account).
- **mysupportdetails site articles** link to the GitHub repo (SEO backlink,
  authority signal).

This separation guarantees that:

- No personal asset (secrets, config, monetization) accidentally ends up in a
  public repo.
- The KuramaLab brand is cleanly separated from the personal
  michelmarrazzo identity in the eyes of the open-source community.
- External contributors see only mysupportdetails-mcp, not the whole mono-repo.

## v2.0.0 ... opt-in encryption at-rest (target Q4 2026)

- [ ] `--encrypt` flag at server startup
- [ ] AES-256-GCM over every profile file
- [ ] Master key in the native OS keychain:
  - macOS: `keytar` (Keychain Services)
  - Linux: `keytar` (libsecret)
  - Windows: `keytar` (DPAPI Credential Manager)
- [ ] Fallback password prompt if the keychain is unavailable
- [ ] Migration script v0.x -> v2 (opt-in encrypt of existing profiles)
- [ ] Cross-platform test on all three OSes
- [ ] Doc update in SECURITY.md

Deliverable: mysupportdetails-mcp usable for security-sensitive scenarios.

## v3.0.0 ... multi-context + remote transport (long-term)

- [ ] `browser_open` tool accepts opt-in `contextId`
- [ ] `browser_switch_context({contextId})` to activate a specific one
- [ ] Refactor of the state manager for N-context lifecycle
- [ ] Optional HTTP/WebSocket transport to run the MCP server remotely
- [ ] Auth token + rate limit on the remote transport
- [ ] Docker image to deploy the headless MCP server in a cluster

Deliverable: enterprise cross-team scenarios + testing farms.

## Success metrics

- **v1.0.0 week 1**: 50 GitHub stars, 500 npm downloads
- **v1.0.0 month 1**: 200 stars, 2000 downloads, 3 external issues
- **v1.0.0 month 3**: 500 stars, 10k downloads, 5 external contributors
- **v2.0.0 month 6**: 1k stars, documented adoption by at least 2 enterprise teams

## Non-goals (explicitly OUT of scope)

- **Browsers other than Chromium/Firefox/WebKit** (e.g. Brave, Opera, Edge as separate targets). If you want Brave, use Chromium with the Brave extension in the profile.
- **Mobile emulation via device manager** (use the DevTools mobile emulation via `browser_evaluate` if you need it).
- **Video screen recording**: outside the MCP domain. If you need video, use Playwright directly in tests.
- **Assertions framework**: mysupportdetails-mcp is a capabilities provider, not a test runner.
- **Web UI dashboard**: the agent already has access, no extra GUI needed.
