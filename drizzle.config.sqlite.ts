import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.sqlite.ts', // Points to your SQLite schema
  out: './src/db/migrations/sqlite',  // Puts SQLite migrations in their own folder
  dialect: 'sqlite',
});