/**
 * An enumeration representing the actions for directory watcher imports.
 * @enum {string}
 */
export enum DirectoryWatcherImportAction {
  /**
   * Indicates a new submission.
   */
  NEW_SUBMISSION = 'NEW_SUBMISSION',
  /**
   * Indicates a new submission with a template.
   */
  NEW_SUBMISSION_WITH_TEMPLATE = 'NEW_SUBMISSION_WITH_TEMPLATE',
  /**
   * Indicates an add to submission.
   */
  ADD_TO_SUBMISSION = 'ADD_TO_SUBMISSION',
}
