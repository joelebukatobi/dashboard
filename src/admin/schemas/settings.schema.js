import { z } from 'zod';

/** Settings forms send many dynamic keys; validate shape loosely. */
export const settingsUpdateSchema = z.record(z.unknown());
