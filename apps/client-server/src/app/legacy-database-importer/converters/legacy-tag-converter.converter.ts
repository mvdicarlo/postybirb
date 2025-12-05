import { SchemaKey } from '@postybirb/database';
import { LegacyTagConverter } from '../legacy-entities/legacy-tag-converter';
import { LegacyConverter } from './legacy-converter';

export class LegacyTagConverterConverter extends LegacyConverter {
  modernSchemaKey: SchemaKey = 'TagConverterSchema';

  LegacyEntityConstructor = LegacyTagConverter;

  legacyFileName = 'tag-converter';
}
