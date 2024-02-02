import { getType } from 'mime';

export function getMimeTypeForFile(filenameOrExtension: string): string | null {
  return getType(filenameOrExtension);
}
