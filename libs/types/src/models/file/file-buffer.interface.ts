import { IEntity } from '../database/entity.interface';
import { IFileDimensions } from './file-dimensions.interface';

/**
 * Defines a buffer for a file and its associated attributes.
 * @interface IFileBuffer
 * @extends {FileDimensions, IEntity}
 */
export interface IFileBuffer extends IFileDimensions, IEntity {
  /**
   * Buffer for the file.
   */
  buffer: Buffer;

  /**
   * Name of the file.
   */
  fileName: string;

  /**
   * MIME type of the file.
   */
  mimeType: string;
}
