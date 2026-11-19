import { defineConfig } from 'drizzle-kit';

// The app's own SQLite (SRS 8.7). driver 'expo' emits drizzle/migrations.js for the bundle.
export default defineConfig({
  schema: './src/data/db/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
  casing: 'snake_case',
});
