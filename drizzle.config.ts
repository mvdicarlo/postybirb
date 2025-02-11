import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite', // Database dialect
  schema: './libs/database/src/lib/schemas/index.ts', // Path to your schema definitions
  out: './apps/postybirb/src/migrations', // Directory for migrations
});
