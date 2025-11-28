import { SchemaKey } from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { join } from 'path';
import { Class } from 'type-fest';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
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
    return new PostyBirbDatabase(this.modernSchemaKey);
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
      const modernEntity = legacyEntity.convert();

      // Skip null conversions (e.g., deprecated websites)
      if (modernEntity === null) {
        skippedCount++;
        continue;
      }

      await modernDb.insert(modernEntity);
    }

    if (skippedCount > 0) {
      logger.info(`Skipped ${skippedCount} records during conversion`);
    }

    logger.info(`Import for ${this.legacyFileName} completed successfully.`);
  }
}
