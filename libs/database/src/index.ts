export * from './lib/database';
export * from './lib/helper-types';
export * from './lib/schemas';

// Repository infrastructure
export { EntityNotFoundError } from './lib/repositories/base/entity-not-found.error';
export {
    EntityRepository,
    type EntityRepositoryConfig
} from './lib/repositories/base/entity-repository';
export { HydrationContext } from './lib/repositories/base/hydration-context';
export { OptimisticConcurrencyError } from './lib/repositories/base/optimistic-concurrency.error';
export { RepositoryRegistry } from './lib/repositories/base/repository-registry';
export type {
    DefaultWithFor,
    EntityCtor,
    EntityId,
    FindFirstConfig,
    FindManyConfig,
    RepoEntity,
    RepoSchemaKey,
    SchemaQuery,
    SchemaTable,
    TableSchemaKey
} from './lib/repositories/base/types';

// Transaction context
export {
    TransactionContext,
    withTransactionContext
} from './lib/transaction/transaction-context';

// Entity classes and *Row type aliases
export * from './lib/entities';

// Concrete repository subclasses — one per schema
export * from './lib/repositories';

// saveFromEntity — resolves the target repository via RepositoryRegistry;
// throws OptimisticConcurrencyError on version conflict
export { saveFromEntity } from './lib/save-from-entity';

