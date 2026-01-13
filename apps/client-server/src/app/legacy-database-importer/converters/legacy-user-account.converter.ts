import { SchemaKey } from '@postybirb/database';
import { LegacyUserAccount } from '../legacy-entities/legacy-user-account';
import { LegacyConverter } from './legacy-converter';

export class LegacyUserAccountConverter extends LegacyConverter {
  modernSchemaKey: SchemaKey = 'AccountSchema';

  LegacyEntityConstructor = LegacyUserAccount;

  legacyFileName = 'accounts';

  /**
   * Enable WebsiteData support for account imports.
   * This allows importing OAuth tokens, API keys, and other credentials
   * stored in the legacy account.data field.
   */
  protected readonly supportsWebsiteData: boolean = true;
}
