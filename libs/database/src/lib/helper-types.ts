import { PostyBirbDatabaseType } from './database';
import * as Schemas from './schemas';

export type SchemaKey = Extract<
  keyof typeof Schemas,
  `${string}Schema`
>;

export type PostyBirbTransaction = Parameters<
  Parameters<PostyBirbDatabaseType['transaction']>['0']
>['0'];

export type Insert<TSchemaKey extends SchemaKey> =
  (typeof Schemas)[TSchemaKey]['$inferInsert'];

export type Select<TSchemaKey extends SchemaKey> =
  (typeof Schemas)[TSchemaKey]['$inferSelect'];
