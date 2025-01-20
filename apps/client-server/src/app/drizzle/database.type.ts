import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schemas';

export const Database = 'PostyBirbDatabase';
export type PostyBirbDatabase = BetterSQLite3Database<typeof schema>;
