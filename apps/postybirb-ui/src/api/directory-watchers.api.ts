import {
  ICreateDirectoryWatcherDto,
  ISubmissionDto,
  IUpdateDirectoryWatcherDto,
} from '@postybirb/dto';
import { IDirectoryWatcher } from '@postybirb/types';
import { HistoryAction } from '../modules/action-history/action-history';
import Https from '../transports/https';

export default class DirectoryWatchersApi {
  private static readonly request: Https = new Https('directory-watchers');

  static get(id: string) {
    return DirectoryWatchersApi.request
      .get<IDirectoryWatcher>(id)
      .then((res) => res.body);
  }

  static getAll() {
    return DirectoryWatchersApi.request
      .get<IDirectoryWatcher[]>()
      .then((res) => res.body);
  }

  static create(create: ICreateDirectoryWatcherDto) {
    return DirectoryWatchersApi.request.post<ISubmissionDto, unknown>(
      '',
      create
    );
  }

  static update(update: IUpdateDirectoryWatcherDto) {
    return DirectoryWatchersApi.request.patch<ISubmissionDto, unknown>(
      '',
      update
    );
  }

  static remove(ids: string[]) {
    return DirectoryWatchersApi.request.delete('', {
      ids,
    });
  }
}
