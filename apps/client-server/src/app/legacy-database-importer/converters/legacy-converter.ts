/* eslint-disable no-underscore-dangle */
import { RepositoryRegistry, SchemaKey } from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { join } from 'path';
import { Class } from 'type-fest';
import { LegacyConverterEntity } from '../legacy-entities/legacy-converter-entity';
import { NdjsonParser } from '../utils/ndjson-parser';

export abstract class LegacyConverter {
  abstract readonly modernSchemaKey: SchemaKey;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract readonly LegacyEntityConstructor: Class<LegacyConverterEntity<any>>;

  abstract readonly legacyFileName: string;

  constructor(protected readonly databasePath: string) {}

  private getEntityFilePath(): string {
    return join(this.databasePath, 'data', `${this.legacyFileName}.db`);
  }

  private getModernDatabase() {
    return RepositoryRegistry.get(this.modernSchemaKey);
  }

  public async import(): Promise<void> {
    const logger = Logger(`LegacyConverter:${this.legacyFileName}`);
    logger.info(`Starting import for ${this.legacyFileName}...`);

    const filePath = this.getEntityFilePath();
    logger.info(`Reading legacy data from ${filePath}...`);
    const parser = new NdjsonParser();
    const result = await parser.parseFile(
      filePath,
      this.LegacyEntityConstructor,
    );

    logger.info(
      `Parsed ${filePath}: ${result.records.length} records, ${result.errors.length} errors`,
    );
    if (result.errors.length > 0) {
      throw new Error(
        `Errors occurred while parsing ${this.LegacyEntityConstructor.name} data: ${result.errors
          .map((err) => `Line ${err.line}: ${err.error}`)
          .join('; ')}`,
      );
    }
    const modernDb = this.getModernDatabase();

    let skippedCount = 0;
    for (const legacyEntity of result.records) {
      const exists = await modernDb.findById(legacyEntity._id);
      if (exists) {
        logger.warn(
          `Entity with ID ${legacyEntity._id} already exists in modern database. Skipping.`,
        );
        continue;
      }

      const modernEntity = await legacyEntity.convert();

      // Skip null conversions (e.g., deprecated websites)
      if (modernEntity === null) {
        skippedCount++;
        continue;
      }

      try {
        await modernDb.insert(modernEntity);
      } catch (err) {
        const message = (err as Error).message ?? '';
        if (message.includes('UNIQUE constraint failed')) {
          logger.warn(
            `Skipping record ${legacyEntity._id} due to unique constraint violation: ${message}`,
          );
          skippedCount++;
        } else {
          throw err;
        }
      }
    }

    if (skippedCount > 0) {
      logger.info(`Skipped ${skippedCount} records during conversion`);
    }

    logger.info(`Import for ${this.legacyFileName} completed successfully.`);
  }
}
