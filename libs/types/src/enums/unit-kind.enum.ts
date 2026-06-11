/**
 * The kind of an atomic dispatch unit within a PostTask.
 * @enum {string}
 */
export enum UnitKind {
  /** A batch of files posted together to a file website. */
  BATCH = 'BATCH',
  /** A single message/notification post. */
  MESSAGE = 'MESSAGE',
}
