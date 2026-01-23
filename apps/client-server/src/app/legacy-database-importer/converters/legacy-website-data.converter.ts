import { SchemaKey } from '@postybirb/database';
import { LegacyWebsiteData } from '../legacy-entities/legacy-website-data';
import { LegacyConverter } from './legacy-converter';

/**
 * Converter for importing website-specific data (OAuth tokens, API keys, credentials)
 * from legacy PostyBirb Plus accounts.
 *
 * IMPORTANT: This converter must run AFTER LegacyUserAccountConverter because
 * WebsiteData records have a foreign key reference to Account records.
 * The Account must exist before its associated WebsiteData can be created.
 *
 * Only websites with registered transformers in WebsiteDataTransformerRegistry
 * will produce records. Websites using browser cookies for authentication
 * (e.g., FurAffinity, DeviantArt) will be skipped.
 */
export class LegacyWebsiteDataConverter extends LegacyConverter {
  modernSchemaKey: SchemaKey = 'WebsiteDataSchema';

  LegacyEntityConstructor = LegacyWebsiteData;

  /**
   * Reads from the same 'accounts' file as LegacyUserAccountConverter,
   * but only extracts and transforms the website-specific data.
   */
  legacyFileName = 'accounts';
}
