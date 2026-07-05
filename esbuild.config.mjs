import { build } from 'esbuild';

// Build a single-file ESM bundle for the MCP server.
// Playwright is left external because it downloads browsers (~300MB) on first run
// via `npx playwright install`. Bundling it would break the browser install
// and triple the npm package size.
await build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile: 'dist/server.mjs',
  external: ['playwright', 'playwright-core'],
  banner: {
    js: '#!/usr/bin/env node\n' +
        '// @kuramalab-io/mysupportdetails-mcp\n' +
        '// MCP server for QA + test automation with browsers + multiple profiles.\n' +
        '// Source: https://github.com/KuramaLab/mysupportdetails-mcp\n' +
        '// License: MIT (c) 2026 KuramaLab',
  },
  minify: false,
  sourcemap: true,
  logLevel: 'info',
});

// On Unix we need chmod +x on the shebang. Not needed on Windows.
import { chmodSync } from 'node:fs';
if (process.platform !== 'win32') {
  chmodSync('dist/server.mjs', 0o755);
}
