/**
 * FileSubmissionModal utilities and types.
 */

import { FileWithPath } from '@mantine/dropzone';

/**
 * File metadata including the file and its custom title.
 */
export interface FileItem {
  file: FileWithPath;
  title: string;
}

/**
 * Extract file name without extension for default title.
 */
export function getDefaultTitle(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot > 0) {
    return filename.substring(0, lastDot);
  }
  return filename;
}

/**
 * Generate a small thumbnail from a file using Canvas.
 * This significantly reduces memory usage compared to displaying full images.
 */
export async function generateThumbnail(
  file: Blob,
  maxSize = 100
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const originalUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(originalUrl); // Free original immediately

      // Calculate scaled dimensions maintaining aspect ratio
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }

      // Draw to canvas at reduced size
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // eslint-disable-next-line lingui/no-unlocalized-strings
        reject(new Error('Canvas context error'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to small blob URL
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            // eslint-disable-next-line lingui/no-unlocalized-strings
            reject(new Error('Thumbnail error'));
          }
        },
        'image/jpeg',
        0.7 // 70% quality is plenty for thumbnails
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(originalUrl);
      // eslint-disable-next-line lingui/no-unlocalized-strings
      reject(new Error('Image load error'));
    };

    img.src = originalUrl;
  });
}

// Reuse mime types from old uploader
export const TEXT_MIME_TYPES = [
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/xml',
  'text/*',
  'application/rtf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

export const VIDEO_MIME_TYPES = ['video/mp4', 'video/x-m4v', 'video/*'];
