import { IDirectoryWatcher } from '@postybirb/types';

export type ICreateDirectoryWatcherDto = Pick<
  IDirectoryWatcher,
  'importAction' | 'path'
>;
