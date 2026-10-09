import { Account, SchemaKey } from '@postybirb/database';
import { LegacyUserAccount } from '../legacy-entities/legacy-user-account';
import { LegacyConverter } from './legacy-converter';

export class LegacyUserAccountConverter extends LegacyConverter<Account> {
  modernSchemaKey: SchemaKey = 'AccountSchema';

  LegacyEntityConstructor = LegacyUserAccount;

  legacyFileName = 'accounts';
}
