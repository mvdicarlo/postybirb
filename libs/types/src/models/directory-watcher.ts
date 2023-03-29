import { IBaseEntity } from './base-entity';

export enum DirectoryWatcherImportAction {
  NEW_SUBMISSION = 'NEW_SUBMISSION',
  NEW_SUBMISSION_WITH_TEMPLATE = 'NEW_SUBMISSION_WITH_TEMPLATE',
  ADD_TO_SUBMISSION = 'ADD_TO_SUBMISSION',
}

/**
 * Defines entity that reads in files to the app from a folder.
 * @interface IDirectoryWatcher
 * @extends {IBaseEntity}
 */
export interface IDirectoryWatcher extends IBaseEntity {
  /**
   * Path that is read for file ingestion.
   */
  path?: string;

  /**
   * Action applied when ingesting.
   */
  importAction: DirectoryWatcherImportAction;

  /**
   * Template that is applied.
   * Only applies on NEW_SUBMISSION_WITH_TEMPLATE.
   */
  template?: object;

  /**
   * Template that is applied.
   * Only applies on ADD_TO_SUBMISSION.
   */
  submissionId?: string;
}
