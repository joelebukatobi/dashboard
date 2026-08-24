#!/usr/bin/env node
// Bundles every frontend-facing dependency into dist/js/, mirroring how
// build:css produces dist/css/. Each entry is either an already-built
// browser file from node_modules (htmx, preline, apexcharts, alpinejs,
// lucide all ship one) or a custom source file that re-exports just the
// bindings this app uses, for esbuild to tree-shake (CKEditor5 only —
// its npm package has no pre-built browser file at all).
import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'dist/js');

const entries = [
  {
    name: 'htmx',
    entryPoint: path.join(ROOT, 'node_modules/htmx.org/dist/htmx.min.js'),
    // htmx.min.js exposes `window.htmx` only via an implicit top-level `var`
    // leaking to global scope, which esbuild's IIFE bundling wrapper would
    // shadow. bundle: false skips that wrapper and passes the file through
    // (still minified) so the leak behaves the same as loading it directly.
    bundle: false,
  },
  {
    name: 'preline',
    entryPoint: path.join(ROOT, 'node_modules/preline/dist/preline.js'),
    bundle: false,
  },
  {
    name: 'apexcharts',
    entryPoint: path.join(ROOT, 'node_modules/apexcharts/dist/apexcharts.min.js'),
    bundle: false,
  },
  {
    name: 'alpine',
    entryPoint: path.join(ROOT, 'node_modules/alpinejs/dist/cdn.min.js'),
    bundle: false,
  },
  {
    name: 'lucide',
    entryPoint: path.join(ROOT, 'node_modules/lucide/dist/umd/lucide.min.js'),
    bundle: false,
  },
  {
    name: 'ckeditor',
    entryPoint: path.join(ROOT, 'assets/js/entries/ckeditor.js'),
    globalName: 'CKEDITOR',
  },
];

const staticCopies = [
  {
    from: path.join(ROOT, 'node_modules/apexcharts/dist/apexcharts.css'),
    to: path.join(OUT_DIR, 'apexcharts.css'),
  },
  {
    from: path.join(ROOT, 'node_modules/ckeditor5/dist/ckeditor5.css'),
    to: path.join(OUT_DIR, 'ckeditor.css'),
  },
];

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const entry of entries) {
    await build({
      entryPoints: [entry.entryPoint],
      bundle: entry.bundle !== false,
      minify: true,
      // format: 'iife' always wraps output in an anonymous IIFE, even when
      // bundle is false — which would shadow the pre-built files' own
      // top-level globals (see the htmx entry above). Only apply it when
      // actually bundling; passthrough entries get no format wrapper.
      format: entry.bundle === false ? undefined : (entry.format || 'iife'),
      globalName: entry.globalName,
      outfile: path.join(OUT_DIR, `${entry.name}.js`),
      logLevel: 'info',
    });
    console.log(`✅ dist/js/${entry.name}.js`);
  }

  for (const { from, to } of staticCopies) {
    fs.copyFileSync(from, to);
    console.log(`✅ ${path.relative(ROOT, to)} (copied)`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
