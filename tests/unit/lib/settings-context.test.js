import { describe, it, expect } from 'vitest';
import { bindRequestSettings, getRequestSettings } from '../../../src/lib/settings-context.js';

describe('bindRequestSettings', () => {
  it('survives an async gap between the bind and the read, like a Fastify onRequest hook handing off to a route handler', async () => {
    await new Promise((resolveOuter) => {
      bindRequestSettings({ dateFormat: 'DD/MM/YYYY' }, async () => {
        // Simulates a DB query between the hook binding settings and the
        // handler/template actually reading them back.
        await new Promise((r) => setTimeout(r, 5));
        expect(getRequestSettings()).toEqual({ dateFormat: 'DD/MM/YYYY' });
        resolveOuter();
      });
    });
  });

  it('defaults to an empty object when nothing is bound', () => {
    expect(getRequestSettings()).toEqual({});
  });
});
