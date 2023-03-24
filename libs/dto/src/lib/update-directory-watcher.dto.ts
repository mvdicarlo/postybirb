import { IDirectoryWatcher } from '@postybirb/types';

export type IUpdateDirectoryWatcherDto = Pick<
  IDirectoryWatcher,
  'id' | 'importAction' | 'path'
>;
