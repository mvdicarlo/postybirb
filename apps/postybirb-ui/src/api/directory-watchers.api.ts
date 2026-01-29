import {
  DirectoryWatcherDto,
  ICreateDirectoryWatcherDto,
  IUpdateDirectoryWatcherDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

export const FILE_COUNT_WARNING_THRESHOLD = 10;

export interface CheckPathResult {
  valid: boolean;
  count: number;
  files: string[];
  error?: string;
}

class DirectoryWatchersApi extends BaseApi<
  DirectoryWatcherDto,
  ICreateDirectoryWatcherDto,
  IUpdateDirectoryWatcherDto
> {
  constructor() {
    super('directory-watchers');
  }

  public checkPath(path: string) {
    return this.client.post<CheckPathResult>('check-path', { path });
  }
}

export default new DirectoryWatchersApi();
