import { FileSubmission } from '@postybirb/types';
import { MulterFileInfo } from './multer-file-info';
import { TaskType } from './task-type.enum';

export type Task = CreateTask | UpdateTask;

export type CreateTask = {
  type: TaskType;
  file: MulterFileInfo;
  submission: FileSubmission;
};

export type UpdateTask = {
  type: TaskType;
  file: MulterFileInfo;
  submissionFileId: string;
  target?: 'thumbnail';
};
