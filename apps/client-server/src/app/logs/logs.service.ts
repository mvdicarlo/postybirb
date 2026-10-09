import { Injectable } from '@nestjs/common';
import { PostyBirbDirectories } from '@postybirb/fs';
import { Logger } from '@postybirb/logger';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

/**
 * Service for managing log file operations.
 * Provides the ability to bundle all log files into a downloadable .tar.gz archive.
 */
@Injectable()
export class LogsService {
  private readonly logger = Logger('LogsService');

  /**
   * Creates a gzipped tar archive of all files in the logs directory.
   * Uses Node.js built-in zlib (no external dependencies).
   *
   * @returns A Buffer containing the .tar.gz archive
   */
  getLogsArchive(): Buffer {
    const logsDir = PostyBirbDirectories.LOGS_DIRECTORY;
    this.logger.info(`Creating logs archive from: ${logsDir}`);

    const files = readdirSync(logsDir);
    const tarBuffer = this.createTar(logsDir, files);
    return gzipSync(tarBuffer);
  }

  /**
   * Creates a tar archive buffer from the given files.
   * Implements a minimal tar writer (POSIX ustar format) sufficient for
   * bundling flat log files.
   */
  private createTar(dir: string, fileNames: string[]): Buffer {
    const blocks: Buffer[] = [];

    for (const fileName of fileNames) {
      try {
        const filePath = join(dir, fileName);
        const content = readFileSync(filePath);
        const header = this.createTarHeader(fileName, content.length);
        blocks.push(header);
        blocks.push(content);

        // Pad content to 512-byte boundary
        const remainder = content.length % 512;
        if (remainder > 0) {
          blocks.push(Buffer.alloc(512 - remainder));
        }
      } catch (err) {
        this.logger.withError(err).warn(`Skipping file: ${fileName}`);
      }
    }

    // End-of-archive marker: two 512-byte blocks of zeros
    blocks.push(Buffer.alloc(1024));

    return Buffer.concat(blocks);
  }

  /**
   * Creates a 512-byte tar header for a single file entry.
   */
  private createTarHeader(fileName: string, fileSize: number): Buffer {
    const header = Buffer.alloc(512);

    // File name (0–99, 100 bytes)
    header.write(fileName.slice(0, 100), 0, 100, 'utf-8');

    // File mode (100–107, 8 bytes) — 0644
    header.write('0000644\0', 100, 8, 'utf-8');

    // Owner UID (108–115, 8 bytes)
    header.write('0000000\0', 108, 8, 'utf-8');

    // Group GID (116–123, 8 bytes)
    header.write('0000000\0', 116, 8, 'utf-8');

    // File size in octal (124–135, 12 bytes)
    header.write(`${fileSize.toString(8).padStart(11, '0')}\0`, 124, 12, 'utf-8');

    // Modification time in octal (136–147, 12 bytes)
    const mtime = Math.floor(Date.now() / 1000);
    header.write(`${mtime.toString(8).padStart(11, '0')}\0`, 136, 12, 'utf-8');

    // Type flag (156, 1 byte) — '0' for regular file
    header.write('0', 156, 1, 'utf-8');

    // USTAR magic (257–262, 6 bytes) + version (263–264, 2 bytes)
    header.write('ustar\0', 257, 6, 'utf-8');
    header.write('00', 263, 2, 'utf-8');

    // Checksum placeholder: fill with spaces first (148–155, 8 bytes)
    header.write('        ', 148, 8, 'utf-8');

    // Compute checksum (sum of all unsigned bytes in the header)
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    // Write checksum in octal, null-terminated, space-padded
    header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'utf-8');

    return header;
  }
}
