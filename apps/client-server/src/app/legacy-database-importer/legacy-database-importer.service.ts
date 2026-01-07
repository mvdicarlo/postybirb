import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { app } from 'electron';
import { join } from 'path';
import { LegacyConverter } from './converters/legacy-converter';
import { LegacyCustomShortcutConverter } from './converters/legacy-custom-shortcut.converter';
import { LegacyTagConverterConverter } from './converters/legacy-tag-converter.converter';
import { LegacyTagGroupConverter } from './converters/legacy-tag-group.converter';
import { LegacyUserAccountConverter } from './converters/legacy-user-account.converter';
import { LegacyImportDto } from './dtos/legacy-import.dto';

@Injectable()
export class LegacyDatabaseImporterService {
  private readonly logger = Logger(LegacyDatabaseImporterService.name);

  protected readonly LEGACY_POSTYBIRB_PLUS_PATH = join(
    app.getPath('documents'),
    'PostyBirb',
  );

  async import(importRequest: LegacyImportDto): Promise<{ errors: Error[] }> {
    const path = importRequest.customPath || this.LEGACY_POSTYBIRB_PLUS_PATH;

    const errors: Error[] = [];
    if (importRequest.accounts) {
      // Import user accounts
      const result = await this.processImport(
        new LegacyUserAccountConverter(path),
      );
      if (result.error) {
        errors.push(result.error);
      }
    }

    if (importRequest.tagGroups) {
      // Import tag groups
      const result = await this.processImport(
        new LegacyTagGroupConverter(path),
      );
      if (result.error) {
        errors.push(result.error);
      }
    }

    if (importRequest.tagConverters) {
      // Import tag converters
      const result = await this.processImport(
        new LegacyTagConverterConverter(path),
      );
      if (result.error) {
        errors.push(result.error);
      }
    }

    if (importRequest.customShortcuts) {
      // Import custom shortcuts
      const result = await this.processImport(
        new LegacyCustomShortcutConverter(path),
      );
      if (result.error) {
        errors.push(result.error);
      }
    }

    return { errors };
  }

  private async processImport(
    converter: LegacyConverter,
  ): Promise<{ error?: Error }> {
    try {
      this.logger.info(`Starting import for ${converter.legacyFileName}...`);
      await converter.import();
      return {};
    } catch (error) {
      this.logger.error(
        `Import for ${converter.legacyFileName} failed.`,
        error,
      );
      return { error };
    }
  }
}
