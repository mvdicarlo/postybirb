/* eslint-disable no-underscore-dangle */
/* eslint-disable no-continue */
import { Logger } from '@postybirb/logger';
import {
  ISubmissionMetadata,
  ISubmissionScheduleInfo,
  NULL_ACCOUNT_ID,
  ScheduleType,
  SubmissionType,
} from '@postybirb/types';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { v4 } from 'uuid';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { LegacyFileRecord, LegacySubmission } from '../legacy-entities/legacy-submission';
import { LegacySubmissionPart } from '../legacy-entities/legacy-submission-part';
import { SubmissionPartTransformerRegistry } from '../transformers/submission-part/submission-part-transformer-registry';
import { LegacyDescriptionConverter } from '../utils/legacy-description-converter';
import { NdjsonParser } from '../utils/ndjson-parser';
import { WebsiteNameMapper } from '../utils/website-name-mapper';

const logger = Logger('LegacySubmissionConverter');

/**
 * Maps legacy SubmissionType to modern SubmissionType.
 * Legacy: 'FILE' | 'NOTIFICATION'
 * Modern: 'FILE' | 'MESSAGE'
 */
function mapSubmissionType(legacyType: string): SubmissionType {
  if (legacyType === 'FILE') {
    return SubmissionType.FILE;
  }
  return SubmissionType.MESSAGE;
}

/**
 * Converts legacy schedule to modern schedule info.
 */
function convertSchedule(
  legacySchedule: { isScheduled?: boolean; postAt?: number } | undefined,
): { isScheduled: boolean; schedule: ISubmissionScheduleInfo } {
  if (!legacySchedule?.isScheduled || !legacySchedule.postAt) {
    return {
      isScheduled: false,
      schedule: { scheduleType: ScheduleType.NONE },
    };
  }

  return {
    isScheduled: true,
    schedule: {
      scheduleType: ScheduleType.SINGLE,
      scheduledFor: new Date(legacySchedule.postAt).toISOString(),
    },
  };
}

/**
 * Reads a file from disk for file submission import.
 * Returns the buffer and metadata, or null if the file cannot be read.
 */
function readLegacyFile(
  fileRecord: LegacyFileRecord,
): { buffer: Buffer; fileName: string; mimeType: string; size: number; width: number; height: number } | null {
  // Try primary location first, then fallback to originalPath
  const paths = [fileRecord.location, fileRecord.originalPath].filter(Boolean);

  for (const filePath of paths) {
    if (filePath && existsSync(filePath)) {
      try {
        const buffer = readFileSync(filePath);
        return {
          buffer,
          fileName: fileRecord.name,
          mimeType: fileRecord.mimetype || 'application/octet-stream',
          size: buffer.length,
          width: fileRecord.width ?? 0,
          height: fileRecord.height ?? 0,
        };
      } catch (err) {
        logger.warn(`Failed to read file at "${filePath}": ${err}`);
      }
    }
  }

  logger.warn(
    `File not found for submission file "${fileRecord.name}". ` +
    `Tried: ${paths.join(', ')}`,
  );
  return null;
}

/**
 * Unified converter for legacy submissions and submission templates.
 *
 * Handles:
 * - Parsing `submissions.db` or `submission-templates.db` NDJSON files
 * - Parsing `submission-part.db` NDJSON files
 * - Creating Submission records in modern database
 * - Creating WebsiteOptions records from submission parts
 * - Copying file submission files into FileBuffer/SubmissionFile records
 *
 * Does NOT extend LegacyConverter base class since it manages multiple
 * schema tables in a single import operation.
 */
export class LegacySubmissionConverter {
  private readonly parser = new NdjsonParser();

  constructor(
    private readonly databasePath: string,
    private readonly isTemplate = false,
  ) {}

  /**
   * The filename for the submission data (without .db extension).
   */
  get submissionFileName(): string {
    return this.isTemplate ? 'submission-templates' : 'submissions';
  }

  public async import(): Promise<void> {
    const submissionDb = new PostyBirbDatabase('SubmissionSchema');
    const websiteOptionsDb = new PostyBirbDatabase('WebsiteOptionsSchema');
    const accountDb = new PostyBirbDatabase('AccountSchema');
    const submissionFileDb = new PostyBirbDatabase('SubmissionFileSchema');
    const fileBufferDb = new PostyBirbDatabase('FileBufferSchema');

    // Step 1: Parse submissions
    const submissionFilePath = join(
      this.databasePath,
      'data',
      `${this.submissionFileName}.db`,
    );
    logger.info(`Parsing submissions from ${submissionFilePath}...`);

    const submissionResult = await this.parser.parseFile(
      submissionFilePath,
      LegacySubmission,
    );

    if (submissionResult.errors.length > 0) {
      throw new Error(
        `Errors parsing submissions: ${submissionResult.errors
          .map((err) => `Line ${err.line}: ${err.error}`)
          .join('; ')}`,
      );
    }

    if (submissionResult.records.length === 0) {
      logger.info('No submissions found to import.');
      return;
    }

    // Step 2: Parse submission parts
    let submissionParts: LegacySubmissionPart[] = [];

    if (this.isTemplate) {
      // Templates store parts inline — extract them from each template record
      submissionParts = this.extractTemplateParts(submissionResult.records);
    } else {
      const partsFilePath = join(
        this.databasePath,
        'data',
        'submission-part.db',
      );
      logger.info(`Parsing submission parts from ${partsFilePath}...`);

      const partsResult = await this.parser.parseFile(
        partsFilePath,
        LegacySubmissionPart,
      );

      if (partsResult.errors.length > 0) {
        throw new Error(
          `Errors parsing submission parts: ${partsResult.errors
            .map((err) => `Line ${err.line}: ${err.error}`)
            .join('; ')}`,
        );
      }

      submissionParts = partsResult.records;
    }

    // Step 3: Group parts by submissionId
    const partsBySubmission = new Map<string, LegacySubmissionPart[]>();
    for (const part of submissionParts) {
      const parts = partsBySubmission.get(part.submissionId) ?? [];
      parts.push(part);
      partsBySubmission.set(part.submissionId, parts);
    }

    // Step 4: Process each submission
    let importedCount = 0;
    let skippedCount = 0;
    let fileCount = 0;

    for (const legacySub of submissionResult.records) {
      // Check for duplicates
      const exists = await submissionDb.findById(legacySub._id);
      if (exists) {
        logger.warn(
          `Submission ${legacySub._id} already exists. Skipping.`,
        );
        skippedCount++;
        continue;
      }

      const modernType = mapSubmissionType(legacySub.type);
      const { isScheduled, schedule } = convertSchedule(legacySub.schedule);

      const metadata: ISubmissionMetadata = {};
      if (this.isTemplate) {
        metadata.template = {
          name: legacySub.alias || legacySub.title || 'Imported Template',
        };
      }

      // Insert submission
      await submissionDb.insert({
        id: legacySub._id,
        type: modernType,
        isScheduled,
        schedule,
        isTemplate: this.isTemplate,
        isMultiSubmission: false,
        isArchived: false,
        isInitialized: true,
        metadata,
        order: legacySub.order ?? 0,
      });

      // Step 5: Import files for FILE submissions (non-templates)
      if (modernType === SubmissionType.FILE && !this.isTemplate && legacySub.primary) {
        const files = [legacySub.primary, ...(legacySub.additional ?? [])];

        for (let i = 0; i < files.length; i++) {
          const fileRecord = files[i];
          const fileData = readLegacyFile(fileRecord);

          if (!fileData) {
            continue;
          }

          const hash = createHash('sha256')
            .update(fileData.buffer)
            .digest('hex');

          const submissionFileId = v4();
          const fileBufferId = v4();

          // Insert SubmissionFile first (FileBuffer has FK to SubmissionFile)
          await submissionFileDb.insert({
            id: submissionFileId,
            submissionId: legacySub._id,
            fileName: fileData.fileName,
            hash,
            mimeType: fileData.mimeType,
            size: fileData.size,
            width: fileData.width,
            height: fileData.height,
            hasThumbnail: false,
            hasCustomThumbnail: false,
            hasAltFile: false,
            metadata: {},
            order: fileRecord.order ?? i,
          });

          // Insert FileBuffer with reference to SubmissionFile
          await fileBufferDb.insert({
            id: fileBufferId,
            submissionFileId,
            buffer: fileData.buffer,
            fileName: fileData.fileName,
            mimeType: fileData.mimeType,
            size: fileData.size,
            width: fileData.width,
            height: fileData.height,
          });

          // Update SubmissionFile with the primaryFileId
          await submissionFileDb.update(submissionFileId, {
            primaryFileId: fileBufferId,
          });

          fileCount++;
        }
      }

      // Step 6: Import submission parts as WebsiteOptions
      const parts = partsBySubmission.get(legacySub._id) ?? [];

      for (const part of parts) {
        if (part.isDefault) {
          // Default part → WebsiteOptions with NULL_ACCOUNT_ID
          const transformer = SubmissionPartTransformerRegistry.getTransformer(
            part.website,
          );

          // For default parts, use base conversion even without a website-specific transformer
          const data = transformer
            ? transformer.transform(part.data, legacySub.type)
            : this.convertDefaultPartData(part.data);

          if (!data) {
            continue;
          }

          await websiteOptionsDb.insert({
            submissionId: legacySub._id,
            accountId: NULL_ACCOUNT_ID,
            data,
            isDefault: true,
          });
          continue;
        }

        // Non-default part: needs a valid account and transformer
        const newWebsiteId = WebsiteNameMapper.map(part.website);
        if (!newWebsiteId) {
          logger.debug(
            `Skipping part for deprecated website "${part.website}" ` +
            `(submission: ${legacySub._id})`,
          );
          continue;
        }

        const transformer = SubmissionPartTransformerRegistry.getTransformer(
          part.website,
        );
        if (!transformer) {
          logger.debug(
            `No submission-part transformer for "${part.website}". ` +
            `Skipping part (submission: ${legacySub._id}).`,
          );
          continue;
        }

        // Check if account exists
        const account = await accountDb.findById(part.accountId);
        if (!account) {
          logger.warn(
            `Account "${part.accountId}" not found for part "${part._id}". ` +
            `Skipping (the account may not have been imported).`,
          );
          continue;
        }

        const data = transformer.transform(part.data, legacySub.type);
        if (!data) {
          continue;
        }

        await websiteOptionsDb.insert({
          submissionId: legacySub._id,
          accountId: part.accountId,
          data,
          isDefault: false,
        });
      }

      importedCount++;
    }

    logger.info(
      `${this.isTemplate ? 'Template' : 'Submission'} import completed: ` +
      `${importedCount} imported, ${skippedCount} skipped, ${fileCount} files copied.`,
    );
  }

  /**
   * Extracts submission parts from legacy template records.
   * Templates store parts inline as a `parts` Record<string, SubmissionPart>.
   */
  private extractTemplateParts(
    templates: LegacySubmission[],
  ): LegacySubmissionPart[] {
    const parts: LegacySubmissionPart[] = [];

    for (const template of templates) {
      // Legacy templates are parsed as LegacySubmission but may have a `parts` field
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawParts = (template as any).parts as Record<string, any> | undefined;
      if (!rawParts) {
        continue;
      }

      for (const [key, partData] of Object.entries(rawParts)) {
        parts.push(
          new LegacySubmissionPart({
            _id: partData._id ?? `${template._id}-${key}`,
            data: partData.data,
            accountId: partData.accountId ?? key,
            submissionId: template._id,
            website: partData.website ?? '',
            isDefault: partData.isDefault ?? key === 'default',
            postStatus: partData.postStatus ?? 'UNPOSTED',
          }),
        );
      }
    }

    return parts;
  }

  /**
   * Converts default part data using basic field mappings.
   * Used when no website-specific transformer is available for the default part.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private convertDefaultPartData(legacyData: any): Record<string, any> | null {
    if (!legacyData) {
      return null;
    }

    // Map common fields from legacy DefaultOptions to modern IWebsiteFormFields
    const ratingMap: Record<string, string> = {
      general: 'GENERAL',
      mature: 'MATURE',
      adult: 'ADULT',
      extreme: 'EXTREME',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {
      title: legacyData.title ?? '',
    };

    if (legacyData.tags) {
      result.tags = {
        overrideDefault: !legacyData.tags.extendDefault,
        tags: Array.isArray(legacyData.tags.value) ? legacyData.tags.value : [],
      };
    }

    if (legacyData.description) {
      const html = legacyData.description.value || '';
      result.description = {
        overrideDefault: legacyData.description.overwriteDefault ?? false,
        description: LegacyDescriptionConverter.convert(html),
      };
    }

    if (legacyData.rating) {
      const mapped = ratingMap[legacyData.rating.toLowerCase()];
      if (mapped) {
        result.rating = mapped;
      }
    }

    if (legacyData.spoilerText) {
      result.contentWarning = legacyData.spoilerText;
    }

    return result;
  }
}
