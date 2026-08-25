import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const patternsOf = (yamlPath) => {
  const yaml = readFileSync(yamlPath, 'utf8');
  const start = yaml.indexOf('          exclude: |');
  if (start === -1) return null;
  const lines = yaml.slice(start).split('\n').slice(1);
  const out = [];
  for (const line of lines) {
    if (!line.startsWith('            ')) break;
    const value = line.trim();
    if (value) out.push(value);
  }
  return out;
};

const sharedList = readFileSync('scripts/deploy/exclude.txt', 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

describe('deploy exclude list', () => {
  it('matches the sandbox workflow', () => {
    expect(patternsOf('.github/workflows/deploy-sandbox.yml')).toEqual(sharedList);
  });

  it('matches the production workflow', () => {
    // Both branches ship identical code, so both pipelines must ship an
    // identical file set. Production previously excluded **/dist/css/**,
    // which dropped the two files `npm run build:css` produces.
    expect(patternsOf('.github/workflows/deploy-production.yml')).toEqual(sharedList);
  });

  it('excludes the things that must never reach a server', () => {
    for (const pattern of ['**/node_modules/**', '**/.env*', '**/.git*', '**/.github/**']) {
      expect(sharedList, `missing ${pattern}`).toContain(pattern);
    }
  });
});

// The rehearsal uploader reimplements the action's glob semantics. If it
// drifts, the rehearsal silently tests a different file set than production
// ships.
const classify = (relPath) =>
  execFileSync('python3', ['-c', `
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('u','scripts/deploy/ftp-upload.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
print('excluded' if m.is_excluded(Path(${JSON.stringify(relPath)}), m.load_patterns()) else 'included')
`], { encoding: 'utf8' }).trim();

describe('rehearsal uploader exclude matching', () => {
  it.each([
    ['node_modules/lodash/index.js', 'excluded'],
    ['.env.local', 'excluded'],
    ['.env.production', 'excluded'],
    ['.git/config', 'excluded'],
    ['.gitignore', 'excluded'],
    ['public/uploads/photo.png', 'excluded'],
    ['tmp/restart.txt', 'excluded'],
    ['.build/admin.css', 'excluded'],
    ['.github/workflows/ci.yml', 'excluded'],
    ['src/app.js', 'included'],
    ['src/db/schema/core.js', 'included'],
    ['package.json', 'included'],
    ['public/css/app.css', 'included'],
    ['docs/README.md', 'included'],
  ])('%s is %s', (path, expected) => {
    expect(classify(path)).toBe(expected);
  });
});
