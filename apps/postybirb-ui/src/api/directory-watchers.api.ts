import {
  ICreateDirectoryWatcherDto,
  IDirectoryWatcher,
  IUpdateDirectoryWatcherDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class DirectoryWatchersApi extends BaseApi<
  IDirectoryWatcher,
  ICreateDirectoryWatcherDto,
  IUpdateDirectoryWatcherDto
> {
  constructor() {
    super('directory-watchers');
  }
}

export default new DirectoryWatchersApi();
