import { getDatabase } from '../database';
import { Settings } from '../entities/settings.entity';
import { SettingsSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class SettingsRepository extends EntityRepository<
  'SettingsSchema',
  Settings
> {
  constructor() {
    super({
      schemaKey: 'SettingsSchema',
      table: SettingsSchema,
      query: getDatabase().query.SettingsSchema,
      EntityClass: Settings,
    });
  }
}
