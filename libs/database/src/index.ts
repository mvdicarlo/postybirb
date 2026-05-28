import * as Relations from './lib/relations/relations';
import * as schemas from './lib/schemas';

const Schemas = {
  ...schemas,
  ...Relations,
};

export * from './lib/database';
export * from './lib/helper-types';
export * from './lib/schemas';
export { Schemas };

// Repository infrastructure (Phase A of the Drizzle repository migration).
// See docs/DRIZZLE_REPOSITORY_MIGRATION.md and the companion
// implementation plan for the full migration scope. These exports are the
// public surface of the lib's repository layer; they are emitted now but
// not yet consumed by client-server (that switch happens in Phase D).
  export { EntityNotFoundError } from './lib/repositories/base/entity-not-found.error';
  export {
    EntityRepository,
    type EntityRepositoryConfig
  } from './lib/repositories/base/entity-repository';
  export { HydrationContext } from './lib/repositories/base/hydration-context';
  export { OptimisticConcurrencyError } from './lib/repositories/base/optimistic-concurrency.error';
  export { RepositoryRegistry } from './lib/repositories/base/repository-registry';
  export { SubscriberBus } from './lib/repositories/base/subscriber-bus';
  export type {
    Action,
    DefaultWithFor,
    EntityCtor,
    EntityId,
    FindFirstConfig,
    FindManyConfig,
    RepoEntity,
    SchemaQuery,
    SchemaTable,
    SubscriberCb,
    TableSchemaKey
  } from './lib/repositories/base/types';

// Transaction context (Phase A Step 2). Replaces the legacy
// apps/client-server/src/app/drizzle/transaction-context.ts at the
// client-server cutover in Phase D.
export {
  TransactionContext,
  withTransactionContext
} from './lib/transaction/transaction-context';

// Entity classes and *Row aliases (Phase B Step 5/6). These are the
// lib-side entity implementations consumed by repositories in Phase C
// and by client-server at the cutover in Phase D.
export * from './lib/entities';

