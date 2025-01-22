import { IDirectoryWatcher, SubmissionId } from '../../models';

export type IUpdateDirectoryWatcherDto = Pick<
  IDirectoryWatcher,
  'importAction' | 'path'
> & {
  templateId?: SubmissionId;
};
