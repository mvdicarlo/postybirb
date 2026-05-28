import { DirectoryWatcher } from '../entities/directory-watcher.entity';
import { getDatabase } from '../database';
import { DirectoryWatcherSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class DirectoryWatcherRepository extends EntityRepository<
  'DirectoryWatcherSchema',
  DirectoryWatcher
> {
  constructor() {
    super({
      schemaKey: 'DirectoryWatcherSchema',
      table: DirectoryWatcherSchema,
      query: getDatabase().query.DirectoryWatcherSchema,
      EntityClass: DirectoryWatcher,
    });
  }
}
