/**
 * Relay engine — in-memory job-tree working model + state machine.
 *
 * These are the runtime structures the scheduler/pipeline operate on. They
 * mirror the persisted entity shapes (IPostJob/IPostTask/IPostUnit in
 * @postybirb/types) so they map 1:1 to PostJob/PostTask/PostUnit database
 * entities. Named with a `Relay` prefix to avoid colliding with the DB
 * entity classes. Derived state lives as methods on the nodes (e.g.
 * `RelayJob.computeStatus()`, `RelayTask.evaluateDependency()`); the
 * polymorphic status predicates (`isTerminal`/`isDone`) live in
 * {@link ./node-status}.
 */

export * from './node-status';
export * from './relay-job';
export * from './relay-task';
export * from './relay-unit';

