import { IEntity } from '../database/entity.interface';
import { DirectoryWatcherImportAction } from '../../enums/directory-watcher-import-action.enum';
import { SubmissionId } from '../submission/submission.interface';

/**
 * Defines an entity that reads in files to the app from a folder.
 * @interface IDirectoryWatcher
 * @extends {IEntity}
 */
export interface IDirectoryWatcher extends IEntity {
  /**
   * The path that is read for file ingestion.
   * @type {string|undefined}
   */
  path?: string;

  /**
   * The action that is applied when ingesting files.
   * @type {DirectoryWatcherImportAction}
   */
  importAction: DirectoryWatcherImportAction;

  /**
   * The template that is applied when `importAction` is `NEW_SUBMISSION_WITH_TEMPLATE`.
   * @type {object|undefined}
   */
  template?: object;

  /**
   * The submission IDs that are used when `importAction` is `ADD_TO_SUBMISSION`.
   * @type {SubmissionId[]|undefined}
   */
  submissionIds?: SubmissionId[];
}
