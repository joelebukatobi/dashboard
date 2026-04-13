import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';

config({ path: resolve(process.cwd(), envFile) });

const parsedDatabaseUrl = new URL(process.env.DATABASE_URL || 'mysql://root:password@127.0.0.1:3306/blogcms_dev');

export default defineConfig({
  schema: './src/db/schema.js',
  out: './src/db/migrations',
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
