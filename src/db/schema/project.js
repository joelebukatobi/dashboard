// src/db/schema/project.js
// Fork-owned. Dashboard ships this empty.
//
// Fork-only tables live here. Importing from ./core.js is fine — that is
// reading, not editing:
//
//   import { mysqlTable, varchar } from 'drizzle-orm/mysql-core';
//   import { posts } from './core.js';
//
//   export const events = mysqlTable('events', { ... });
//
// Two things this file cannot do, because Drizzle has no table-extension
// mechanism and permits only one relations() call per table:
//   - add a column to a core table
//   - add to a core table's relations()
// For the first, use a side table here (post_events with postId + eventId).
// If the column belongs on every site, add it upstream in dashboard instead.

export {};
