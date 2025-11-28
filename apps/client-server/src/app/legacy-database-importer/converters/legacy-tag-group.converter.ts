import { SchemaKey } from '@postybirb/database';
import { LegacyTagGroup } from '../legacy-entities/legacy-tag-group';
import { LegacyConverter } from './legacy-converter';

export class LegacyTagGroupConverter extends LegacyConverter {
  modernSchemaKey: SchemaKey = 'TagGroupSchema';

  LegacyEntityConstructor = LegacyTagGroup;

  legacyFileName = 'tag-group';
}
