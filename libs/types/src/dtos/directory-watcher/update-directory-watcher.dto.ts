import { IDirectoryWatcher, SubmissionId } from '../../models';

export type IUpdateDirectoryWatcherDto = Pick<
  IDirectoryWatcher,
  'importAction' | 'path'
> & {
  template?: SubmissionId;
};
