import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';

// On cPanel, Passenger serves public/ as the web root, so a favicon file there
// would shadow the /favicon.svg and /favicon.ico routes that serve the icon
// chosen in Settings. The bundled defaults must live outside public/.
describe('default favicons', () => {
  it('are not in public/', () => {
    expect(existsSync(new URL('../../public/favicon.svg', import.meta.url))).toBe(false);
    expect(existsSync(new URL('../../public/favicon.ico', import.meta.url))).toBe(false);
  });

  it('are in assets/favicon/', () => {
    expect(existsSync(new URL('../../assets/favicon/favicon.svg', import.meta.url))).toBe(true);
    expect(existsSync(new URL('../../assets/favicon/favicon.ico', import.meta.url))).toBe(true);
  });
});
