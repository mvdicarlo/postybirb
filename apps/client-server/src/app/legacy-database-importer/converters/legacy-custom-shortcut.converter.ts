import { CustomShortcut, SchemaKey } from '@postybirb/database';
import { LegacyCustomShortcut } from '../legacy-entities/legacy-custom-shortcut';
import { LegacyConverter } from './legacy-converter';

export class LegacyCustomShortcutConverter extends LegacyConverter<CustomShortcut> {
  modernSchemaKey: SchemaKey = 'CustomShortcutSchema';

  LegacyEntityConstructor = LegacyCustomShortcut;

  legacyFileName = 'custom-shortcut';
}
