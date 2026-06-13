#!/usr/bin/env node
/**
 * Consolidated guardrail checks for the base template.
 * Replaces check-admin-patterns.sh and check-route-validation.sh.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failed = true;
}

function ok(message) {
  console.log(`OK:   ${message}`);
}

function skip(message) {
  console.log(`SKIP: ${message}`);
}

function walkJsFiles(dir, visit) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkJsFiles(full, visit);
    } else if (entry.endsWith('.js')) {
      visit(full);
    }
  }
}

function checkHtmlPatterns() {
  console.log('Checking HTML patterns...');

  const checks = [
    { dir: 'src/admin', label: "reply.type('text/html').send", pattern: /reply\.type\('text\/html'\)\.send/ },
    { dir: 'src/admin', label: 'mainLayout(', pattern: /mainLayout\(/ },
    { dir: 'src/admin', label: 'authLayout(', pattern: /authLayout\(/ },
    { dir: 'src/app', label: "reply.type('text/html').send", pattern: /reply\.type\('text\/html'\)\.send/ },
  ];

  for (const { dir, label, pattern } of checks) {
    const fullDir = join(ROOT, dir);
    const hits = [];

    walkJsFiles(fullDir, (file) => {
      const content = readFileSync(file, 'utf8');
      if (pattern.test(content)) {
        hits.push(file.replace(`${ROOT}/`, ''));
      }
    });

    if (hits.length > 0) {
      for (const hit of hits) {
        fail(`banned pattern (${label}) in ${hit}`);
      }
    } else {
      ok(`no ${label} in ${dir}`);
    }
  }
}

const MULTIPART_FILES = new Set(['images.routes.js', 'videos.routes.js']);
const MULTIPART_ROUTE = /'\/(logo|avatar|batch|upload-image|upload-video)'/;
const MUTATING_ROUTE = /fastify\.(post|put|patch)\(/;
const VALIDATE_HANDLER = /validate(Body|Query|Params|SetupBody)/;
const AUTH_JSON_HANDLER = /handler:.*Controller\.(logout|getCurrentUser)/;

function findRouteFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      findRouteFiles(full, files);
    } else if (entry.endsWith('.routes.js')) {
      files.push(full);
    }
  }
  return files;
}

function checkRouteValidation() {
  console.log('\nChecking route validation...');

  const routesDir = join(ROOT, 'src/admin/routes');

  for (const file of findRouteFiles(routesDir)) {
    const name = file.replace(`${routesDir}/`, '');

    if (MULTIPART_FILES.has(basename(file))) {
      skip(`${name} (multipart file)`);
      continue;
    }

    const lines = readFileSync(file, 'utf8').split('\n');
    const mutating = lines
      .map((line, index) => ({ line, lineno: index + 1 }))
      .filter(({ line }) => MUTATING_ROUTE.test(line));

    if (mutating.length === 0) {
      ok(`${name} (no mutating routes)`);
      continue;
    }

    let fileFailed = false;

    for (const { line, lineno } of mutating) {
      if (MULTIPART_ROUTE.test(line)) {
        skip(`${name}:${lineno} (multipart route)`);
        continue;
      }

      const block = lines.slice(lineno - 1, lineno + 20).join('\n');

      if (VALIDATE_HANDLER.test(block) || AUTH_JSON_HANDLER.test(block)) {
        continue;
      }

      fail(`${name}:${lineno} — mutating route without validate* preHandler\n  ${line.trim()}`);
      fileFailed = true;
    }

    if (!fileFailed && mutating.some(({ line }) => !MULTIPART_ROUTE.test(line))) {
      ok(`${name}`);
    }
  }
}

checkHtmlPatterns();
checkRouteValidation();

if (failed) {
  process.exit(1);
}

console.log('\nAll guardrail checks passed.');
