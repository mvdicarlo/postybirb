import {
  ICreateDirectoryWatcherDto,
  DirectoryWatcherDto,
  IUpdateDirectoryWatcherDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class DirectoryWatchersApi extends BaseApi<
  DirectoryWatcherDto,
  ICreateDirectoryWatcherDto,
  IUpdateDirectoryWatcherDto
> {
  constructor() {
    super('directory-watchers');
  }
}

export default new DirectoryWatchersApi();
