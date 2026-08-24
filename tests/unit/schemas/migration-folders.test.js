import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(process.cwd(), 'src/db/migrations');

describe('migration folders', () => {
  it('ships a project migration folder as an extension point', () => {
    expect(existsSync(join(MIGRATIONS, 'project'))).toBe(true);
  });

  it('has no core migration numbered twice', () => {
    const numbers = readdirSync(MIGRATIONS)
      .filter((file) => file.endsWith('.sql'))
      .map((file) => file.slice(0, 4));
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('lists every core migration file in the journal', () => {
    const journal = JSON.parse(
      readFileSync(join(MIGRATIONS, 'meta/_journal.json'), 'utf8'),
    );
    const tagged = new Set(journal.entries.map((entry) => entry.tag));
    const onDisk = readdirSync(MIGRATIONS)
      .filter((file) => file.endsWith('.sql'))
      .map((file) => file.replace(/\.sql$/, ''));

    for (const tag of onDisk) {
      expect(tagged.has(tag), `${tag}.sql is not in the journal`).toBe(true);
    }
  });
});
