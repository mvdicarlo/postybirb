import { IFileDimensions, ImageResizeProps } from '@postybirb/types';

/**
 * Limits to check against a file's dimensions and size.
 */
export interface ImageResizeLimits {
  /** Maximum width in pixels. */
  maxWidth?: number;
  /** Maximum height in pixels. */
  maxHeight?: number;
  /** Maximum file size in bytes. */
  maxBytes?: number;
}

/**
 * Calculates resize props for an image file based on the given limits.
 * Returns `undefined` if the file does not exceed any limit.
 *
 * @param file - An object with `width`, `height`, and `size` (bytes).
 * @param limits - The maximum allowed dimensions and file size.
 * @returns Resize props if any limit is exceeded, otherwise `undefined`.
 */
export function calculateImageResize(
  file: Pick<IFileDimensions, 'width' | 'height' | 'size'>,
  limits: ImageResizeLimits,
): ImageResizeProps | undefined {
  const { maxWidth, maxHeight, maxBytes } = limits;

  const exceedsWidth = maxWidth != null && file.width > maxWidth;
  const exceedsHeight = maxHeight != null && file.height > maxHeight;
  const exceedsSize = maxBytes != null && file.size > maxBytes;

  if (!exceedsWidth && !exceedsHeight && !exceedsSize) {
    return undefined;
  }

  const props: ImageResizeProps = {};

  if (exceedsWidth) {
    props.width = maxWidth;
  }

  if (exceedsHeight) {
    props.height = maxHeight;
  }

  if (exceedsSize) {
    props.maxBytes = maxBytes;
  }

  return props;
}
