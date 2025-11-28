import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';

export interface ParseResult<T> {
  records: T[];
  errors: ParseError[];
}

export interface ParseError {
  line: number;
  content: string;
  error: string;
}

/**
 * Simple NDJSON (Newline Delimited JSON) parser for NeDB files.
 * Each line in a NeDB file is a separate JSON object.
 */
@Injectable()
export class NdjsonParser {
  private readonly logger = new Logger(NdjsonParser.name);

  /**
   * Parse an NDJSON file and instantiate objects of the specified class
   */
  async parseFile<T>(
    filePath: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EntityClass: new (data: any) => T,
  ): Promise<ParseResult<T>> {
    const records: T[] = [];
    const errors: ParseError[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines
        if (!line) {
          continue;
        }

        try {
          const parsed = JSON.parse(line);
          const instance = new EntityClass(parsed);
          records.push(instance);
        } catch (error) {
          errors.push({
            line: i + 1,
            content: line.substring(0, 100), // Truncate long lines
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (errors.length > 0) {
        this.logger.warn(
          `Parsed ${filePath}: ${records.length} records, ${errors.length} errors`,
        );
      } else {
        this.logger.log(`Parsed ${filePath}: ${records.length} records`);
      }

      return { records, errors };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.warn(`File not found: ${filePath}`);
        return { records: [], errors: [] };
      }

      this.logger.error(`Error reading ${filePath}: ${error}`);
      throw error;
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
