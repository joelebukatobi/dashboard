// src/db/schema.js
// Barrel. Kept at this path so every existing import and drizzle.config.js
// continue to work unchanged. Core tables live in ./schema/core.js; a fork's
// tables live in ./schema/project.js.

export * from './schema/core.js';
export * from './schema/project.js';
