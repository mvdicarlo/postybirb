import { getDatabase } from '../database';
import { TagGroup } from '../entities/tag-group.entity';
import { TagGroupSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class TagGroupRepository extends EntityRepository<
  'TagGroupSchema',
  TagGroup
> {
  constructor() {
    super({
      schemaKey: 'TagGroupSchema',
      table: TagGroupSchema,
      query: getDatabase().query.TagGroupSchema,
      EntityClass: TagGroup,
    });
  }
}
