import { getDatabase } from '../database';
import { CustomShortcut } from '../entities/custom-shortcut.entity';
import { CustomShortcutSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class CustomShortcutRepository extends EntityRepository<
  'CustomShortcutSchema',
  CustomShortcut
> {
  constructor() {
    super({
      schemaKey: 'CustomShortcutSchema',
      table: CustomShortcutSchema,
      query: getDatabase().query.CustomShortcutSchema,
      EntityClass: CustomShortcut,
    });
  }
}
