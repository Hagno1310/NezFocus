import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case', // same as db.module.ts
  dbCredentials: { url: process.env.DATABASE_URL! },
});
