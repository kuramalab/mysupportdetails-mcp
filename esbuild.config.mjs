import { build } from 'esbuild';

// Build single-file ESM bundle per il server MCP.
// Playwright lasciato esterno perche' scarica browser (~300MB) al primo run
// tramite `npx playwright install`. Includerlo nel bundle romperebbe l'install
// dei browser e triplicherebbe la dimensione del pacchetto npm.
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
        '// @kuramalab/mysupportdetails-mcp\n' +
        '// MCP server per QA + test automation con browser + profili multipli.\n' +
        '// Source: https://github.com/KuramaLab/mysupportdetails-mcp\n' +
        '// License: MIT (c) 2026 KuramaLab',
  },
  minify: false,
  sourcemap: true,
  logLevel: 'info',
});

// Su Unix serve chmod +x sullo shebang. Su Windows non necessario.
import { chmodSync } from 'node:fs';
if (process.platform !== 'win32') {
  chmodSync('dist/server.mjs', 0o755);
}
