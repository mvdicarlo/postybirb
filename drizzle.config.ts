import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite', // Database dialect
  schema: './apps/client-server/src/app/drizzle/schemas/index.ts', // Path to your schema definitions
  out: './apps/postybirb/src/migrations', // Directory for migrations
});
