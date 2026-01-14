/**
 * DirectoryWatcherRecord - Concrete class for directory watcher data.
 */

import type {
    DirectoryWatcherDto,
    DirectoryWatcherImportAction,
    SubmissionId,
} from '@postybirb/types';
import { BaseRecord } from './base-record';

/**
 * Record class representing a directory watcher entity.
 */
export class DirectoryWatcherRecord extends BaseRecord {
  readonly path?: string;
  readonly importAction: DirectoryWatcherImportAction;
  readonly template?: SubmissionId;

  constructor(dto: DirectoryWatcherDto) {
    super(dto);
    this.path = dto.path;
    this.importAction = dto.importAction;
    this.template = dto.template;
  }

  /**
   * Check if the watcher has a valid path configured.
   */
  get hasPath(): boolean {
    return Boolean(this.path && this.path.trim().length > 0);
  }

  /**
   * Check if a template is assigned.
   */
  get hasTemplate(): boolean {
    return Boolean(this.template);
  }
}
