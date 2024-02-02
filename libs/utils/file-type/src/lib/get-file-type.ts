import { FileType } from '@postybirb/types';
import { isAudio } from './is-audio';
import { isImage } from './is-image';
import { isText } from './is-text';
import { isVideo } from './is-video';

export function getFileType(filenameOrExtension: string): FileType {
  if (isImage(filenameOrExtension)) return FileType.IMAGE;
  if (isText(filenameOrExtension)) return FileType.TEXT;
  if (isVideo(filenameOrExtension)) return FileType.VIDEO;
  if (isAudio(filenameOrExtension)) return FileType.AUDIO;

  return FileType.UNKNOWN;
}
