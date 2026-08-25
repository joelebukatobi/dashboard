// drizzle.project.config.js
// Generates migrations for fork-owned tables only.
//   npm run db:generate:project
//
// Dashboard's src/db/schema/project.js is empty, so this generates nothing
// here. It ships anyway so a fork has it ready.

import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { resolve } from 'path';

const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';

config({ path: resolve(process.cwd(), envFile) });

const parsedDatabaseUrl = new URL(process.env.DATABASE_URL || 'mysql://blogcms_dev:password@127.0.0.1:3306/blogcms_app');

export default defineConfig({
  schema: './src/db/schema/project.js',
  out: './src/db/migrations/project',
  dialect: 'mysql',
  driver: 'mysql2',
  dbCredentials: {
    host: parsedDatabaseUrl.hostname,
    port: parsedDatabaseUrl.port ? parseInt(parsedDatabaseUrl.port, 10) : 3306,
    user: decodeURIComponent(parsedDatabaseUrl.username),
    password: decodeURIComponent(parsedDatabaseUrl.password),
    database: parsedDatabaseUrl.pathname.replace(/^\//, ''),
    ssl: parsedDatabaseUrl.searchParams.get('ssl') === 'true',
  },
});
