import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// dist/ is gitignored, so every asset the templates reference has to be
// produced by a build step that the deploy actually runs. Getting either half
// wrong ships a site with no JavaScript, silently — the pages render fine and
// nothing errors server-side.

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

const referencedBundles = () => {
  const names = new Set();
  for (const file of walk('src')) {
    for (const m of readFileSync(file, 'utf8').matchAll(/\/dist\/js\/([a-zA-Z0-9_-]+)\.js/g)) {
      names.add(m[1]);
    }
  }
  return [...names].sort();
};

const builtBundles = () => {
  const src = readFileSync('scripts/build-js.js', 'utf8');
  return [...src.matchAll(/name:\s*'([a-zA-Z0-9_-]+)'/g)].map((m) => m[1]).sort();
};

describe('frontend asset bundles', () => {
  it('builds every bundle the templates reference', () => {
    const built = builtBundles();
    for (const name of referencedBundles()) {
      expect(built, `templates load /dist/js/${name}.js but build-js.js does not produce it`)
        .toContain(name);
    }
  });

  it('references at least the core bundles, so the check is not vacuous', () => {
    expect(referencedBundles()).toEqual(expect.arrayContaining(['htmx']));
  });
});

describe('deploy workflow', () => {
  const workflow = readFileSync('.github/workflows/staging-deploy.yml', 'utf8');

  it('runs the JS build, not just the CSS build', () => {
    // Regression guard: the deploy ran only build:css from 2a05674 until this
    // test existed, so htmx never reached the server and every hx-* attribute
    // was inert.
    expect(workflow).toContain('npm run build:js');
  });

  it('runs the CSS build', () => {
    expect(workflow).toContain('npm run build:css');
  });
});
