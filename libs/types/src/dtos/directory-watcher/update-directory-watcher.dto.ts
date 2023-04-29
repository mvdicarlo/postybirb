import { IDirectoryWatcher } from '../../models';

export type IUpdateDirectoryWatcherDto = Pick<
  IDirectoryWatcher,
  'id' | 'importAction' | 'path' | 'submissionIds'
>;
