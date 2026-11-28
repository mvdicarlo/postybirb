/**
 * FileSubmissionModal utilities and types.
 */

import type { FileWithPath } from '@mantine/dropzone';
import { isAllowedUri } from '@tiptap/extension-link';
import type {
  Description,
  SubmissionRating,
  SubmissionSidecar,
  TipTapMark,
  TipTapNode,
} from '@postybirb/types';
import { uniq } from 'lodash';

type MergedSidecarOptions = {
  rating?: SubmissionRating;
  description?: string;
  tags?: string[];
};

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

/**
 * Read the JSON sidecar file next to the given file, if one exists.
 * Undefined on any issue.
 */
export async function readSidecarOptions(
  file: FileWithPath,
): Promise<SubmissionSidecar | undefined> {
  return window.electron?.readSidecarOptions?.(file);
}

function htmlLineToParagraphs(line: string): TipTapNode[] {
  if (typeof document === 'undefined') {
    return [
      line.length
        ? {
            type: 'paragraph',
            content: [{ type: 'text', text: line }],
          }
        : { type: 'paragraph' },
    ];
  }

  const template = document.createElement('template');
  template.innerHTML = line;
  const paragraphs: TipTapNode[] = [];

  const appendInlineNode = (
    node: Node,
    nodes: TipTapNode[],
    marks: TipTapMark[] = [],
  ) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) {
        nodes.push({
          type: 'text',
          text: node.textContent,
          ...(marks.length ? { marks } : {}),
        });
      }
      return;
    }

    if (!(node instanceof HTMLElement)) return;
    const tagName = node.tagName.toLowerCase();

    if (tagName === 'br') {
      nodes.push({ type: 'hardBreak' });
      return;
    }

    const nextMarks = [...marks];
    if (tagName === 'a') {
      const href = node.getAttribute('href');
      if (href && isAllowedUri(href)) {
        nextMarks.push({ type: 'link', attrs: { href } });
      }
    } else if (tagName === 'b' || tagName === 'strong') {
      nextMarks.push({ type: 'bold' });
    } else if (tagName === 'i' || tagName === 'em') {
      nextMarks.push({ type: 'italic' });
    } else if (tagName === 'u') {
      nextMarks.push({ type: 'underline' });
    } else if (tagName === 's' || tagName === 'strike') {
      nextMarks.push({ type: 'strike' });
    }

    node.childNodes.forEach((child) =>
      appendInlineNode(child, nodes, nextMarks),
    );
  };

  let inlineNodes: TipTapNode[] = [];
  const flushInlineNodes = () => {
    if (inlineNodes.length) {
      paragraphs.push({ type: 'paragraph', content: inlineNodes });
      inlineNodes = [];
    }
  };

  template.content.childNodes.forEach((node) => {
    if (node instanceof HTMLElement && node.tagName.toLowerCase() === 'p') {
      flushInlineNodes();
      const content: TipTapNode[] = [];
      node.childNodes.forEach((child) => appendInlineNode(child, content));
      paragraphs.push({
        type: 'paragraph',
        ...(content.length ? { content } : {}),
      });
      return;
    }

    appendInlineNode(node, inlineNodes);
  });
  flushInlineNodes();

  return paragraphs.length ? paragraphs : [{ type: 'paragraph' }];
}

/**
 * Turn sidecar description HTML and text into a TipTap document, splitting
 * explicit newlines into paragraphs while preserving supported HTML markup.
 */
export function textToDescription(text: string): Description {
  return {
    type: 'doc',
    content: text.split(/\r?\n/g).flatMap(htmlLineToParagraphs),
  };
}

/**
 * Merge sidecars of a dropped batch into a single result. Rating and
 * description follow last-file-wins (in file order); tags are unioned and
 * deduplicated. The per-file title is applied by the caller to that file.
 */
export function mergeSidecarOptions(
  sidecars: (SubmissionSidecar | undefined)[],
): MergedSidecarOptions {
  return sidecars.reduce<MergedSidecarOptions>((merged, sidecar) => {
    if (!sidecar) {
      return merged;
    }
    const rating =
      typeof sidecar.rating === 'string'
        ? (sidecar.rating as SubmissionRating)
        : undefined;
    const description =
      typeof sidecar.description === 'string' ? sidecar.description : undefined;
    const tags = Array.isArray(sidecar.tags)
      ? sidecar.tags.filter((tag): tag is string => typeof tag === 'string')
      : undefined;
    return {
      rating: rating ?? merged.rating,
      description: description ?? merged.description,
      tags: uniq([...(merged.tags ?? []), ...(tags ?? [])]),
    };
  }, {});
}
