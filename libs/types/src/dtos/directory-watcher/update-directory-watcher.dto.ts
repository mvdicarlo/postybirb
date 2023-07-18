import { IDirectoryWatcher } from '../../models';

export type IUpdateDirectoryWatcherDto = Pick<
  IDirectoryWatcher,
  'importAction' | 'path' | 'submissionIds'
>;
