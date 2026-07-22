import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseEntity } from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { PlatformService } from '@postybirb/platform';
import { join } from 'path';
import { AccountService } from '../account/account.service';
import { publishEntityCreated } from '../common/events/entity-crud.events';
import { TAG_CONVERTER_EVENT_PREFIX } from '../tag-converters/tag-converter.events';
import { TAG_GROUP_EVENT_PREFIX } from '../tag-groups/tag-group.events';
import { LegacyConverter } from './converters/legacy-converter';
import { LegacyCustomShortcutConverter } from './converters/legacy-custom-shortcut.converter';
import { LegacySubmissionConverter } from './converters/legacy-submission.converter';
import { LegacyTagConverterConverter } from './converters/legacy-tag-converter.converter';
import { LegacyTagGroupConverter } from './converters/legacy-tag-group.converter';
import { LegacyUserAccountConverter } from './converters/legacy-user-account.converter';
import { LegacyWebsiteDataConverter } from './converters/legacy-website-data.converter';
import { LegacyImportDto } from './dtos/legacy-import.dto';

@Injectable()
export class LegacyDatabaseImporterService {
  private readonly logger = Logger(LegacyDatabaseImporterService.name);

  protected readonly LEGACY_POSTYBIRB_PLUS_PATH: string;

  constructor(
    private readonly accountService: AccountService,
    private readonly eventEmitter: EventEmitter2,
    platform: PlatformService,
  ) {
    this.LEGACY_POSTYBIRB_PLUS_PATH = join(
      platform.app.getPath('documents'),
      'PostyBirb',
    );
  }

  async import(
    importRequest: LegacyImportDto,
  ): Promise<{ errors: { message: string }[] }> {
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

      // IMPORTANT: WebsiteData must be imported AFTER accounts because
      // WebsiteData records have a foreign key reference to Account records.
      // The Account must exist before its associated WebsiteData can be created.
      const websiteDataResult = await this.processImport(
        new LegacyWebsiteDataConverter(path),
      );
      if (websiteDataResult.error) {
        errors.push(websiteDataResult.error);
      }

      const allAccounts = await this.accountService.findAll();
      for (const account of allAccounts) {
        if (account) {
          await this.accountService.registerAndLogin(account.id);
        }
      }
    }

    if (importRequest.tagGroups) {
      // Import tag groups
      const result = await this.processImport(
        new LegacyTagGroupConverter(path, (entity) => {
          publishEntityCreated(
            this.eventEmitter,
            TAG_GROUP_EVENT_PREFIX,
            entity.toDTO(),
          );
        }),
      );
      if (result.error) {
        errors.push(result.error);
      }
    }

    if (importRequest.tagConverters) {
      // Import tag converters
      const result = await this.processImport(
        new LegacyTagConverterConverter(path, (entity) => {
          publishEntityCreated(
            this.eventEmitter,
            TAG_CONVERTER_EVENT_PREFIX,
            entity.toDTO(),
          );
        }),
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

    if (importRequest.submissions) {
      // Import submissions (must be after accounts for FK references)
      const submissionResult = await this.processSubmissionImport(
        new LegacySubmissionConverter(path, false),
      );
      if (submissionResult.error) {
        errors.push(submissionResult.error);
      }
    }

    if (importRequest.templates) {
      // Import submission templates
      const templateResult = await this.processSubmissionImport(
        new LegacySubmissionConverter(path, true),
      );
      if (templateResult.error) {
        errors.push(templateResult.error);
      }
    }

    return { errors: errors.map((e) => ({ message: e.message })) };
  }

  private async processImport<TEntity extends DatabaseEntity>(
    converter: LegacyConverter<TEntity>,
  ): Promise<{ error?: Error }> {
    try {
      this.logger.info(`Starting import for ${converter.legacyFileName}...`);
      await converter.import();
      return {};
    } catch (error) {
      this.logger
        .withError(error)
        .error(`Import for ${converter.legacyFileName} failed.`);
      return { error: error as Error };
    }
  }

  private async processSubmissionImport(
    converter: LegacySubmissionConverter,
  ): Promise<{ error?: Error }> {
    try {
      this.logger.info(
        `Starting import for ${converter.submissionFileName}...`,
      );
      await converter.import();
      return {};
    } catch (error) {
      this.logger
        .withError(error)
        .error(`Import for ${converter.submissionFileName} failed.`);
      return { error: error as Error };
    }
  }
}
