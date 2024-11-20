import { FileType } from '@postybirb/types';
import { isAudio, supportsAudio } from './is-audio';
import { isImage, supportsImage } from './is-image';
import { isText, supportsText } from './is-text';
import { isVideo, supportsVideo } from './is-video';

export function getFileType(filenameOrExtension: string): FileType {
  if (isImage(filenameOrExtension)) return FileType.IMAGE;
  if (isText(filenameOrExtension)) return FileType.TEXT;
  if (isVideo(filenameOrExtension)) return FileType.VIDEO;
  if (isAudio(filenameOrExtension)) return FileType.AUDIO;

  return FileType.UNKNOWN;
}

export function getFileTypeFromMimeType(mimeType: string): FileType {
  if (supportsImage(mimeType)) return FileType.IMAGE;
  if (supportsText(mimeType)) return FileType.TEXT;
  if (supportsVideo(mimeType)) return FileType.VIDEO;
  if (supportsAudio(mimeType)) return FileType.AUDIO;

  return FileType.UNKNOWN;
}
