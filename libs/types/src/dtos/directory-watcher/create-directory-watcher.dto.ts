import { IDirectoryWatcher } from '../../models';

export type ICreateDirectoryWatcherDto = Pick<
  IDirectoryWatcher,
  'importAction' | 'path'
>;
