import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CommonSchema } from './common.schema';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import {
    DefaultDescriptionValue,
    DescriptionValue,
} from '../../../../types/src/index';

export const CustomShortcutSchema = sqliteTable('custom-shortcut', {
  ...CommonSchema(),
  name: text().notNull().unique(),
  inline: integer({ mode: 'boolean' }).default(false),
  shortcut: text({ mode: 'json' })
    .notNull()
    .$type<DescriptionValue>()
    .default(DefaultDescriptionValue()),
});
