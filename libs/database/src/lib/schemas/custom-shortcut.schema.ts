import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CommonSchema } from './common.schema';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import {
  Description,
} from '../../../../types/src/index';

export const CustomShortcutSchema = sqliteTable('custom-shortcut', {
  ...CommonSchema(),
  name: text().notNull().unique(),
  shortcut: text({ mode: 'json' })
    .notNull()
    .$type<Description>()
    .default([]),
});
