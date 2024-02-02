import { FileSubmission } from '@postybirb/types';
import { MulterFileInfo } from './multer-file-info';
import { TaskType } from './task-type.enum';

// Task Type
export type Task = CreateTask | UpdateTask;

// Defines CreateTask Params
export type CreateTask = {
  type: TaskType;
  /**
   * File for use.
   * @type {MulterFileInfo}
   */
  file: MulterFileInfo;
  /**
   * Submission the entities will be attached to.
   * @type {FileSubmission}
   */
  submission: FileSubmission;
};

// Defines UpdateTask Params
export type UpdateTask = {
  type: TaskType;
  /**
   * Updating file.
   *
   * @type {MulterFileInfo}
   */
  file: MulterFileInfo;
  /**
   * SubmissionFile being updated.
   * @type {string}
   */
  submissionFileId: string;
  /**
   * The target type being updates (primary on empty).
   * @type {string}
   */
  target?: 'thumbnail';
};
