import { sql } from 'drizzle-orm';
import { integer, text } from 'drizzle-orm/sqlite-core';

export function commonSchema() {
  return {
    id: integer('id').primaryKey({ autoIncrement: true }),
    createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  };
}
