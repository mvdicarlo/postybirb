import { getMimeTypeForFile } from './mime-helper';

const SUPPORTED_MIME: string[] = [
  'video/3gpp',
  'video/3gpp2',
  'video/3gpp',
  'video/3gpp2',
  'video/h261',
  'video/h263',
  'video/h264',
  'video/jpeg',
  'video/jpm',
  'video/mj2',
  'video/mp4',
  'video/mpeg',
  'video/ogg',
  'video/quicktime',
  'video/vnd.fvt',
  'video/vnd.mpegurl',
  'video/vnd.ms-playready.media.pyv',
  'video/vnd.vivo',
  'video/webm',
  'video/x-f4v',
  'video/x-fli',
  'video/x-flv',
  'video/x-m4v',
  'video/x-matroska',
  'video/x-ms-asf',
  'video/x-ms-wm',
  'video/x-ms-wmv',
  'video/x-ms-wmx',
  'video/x-ms-wvx',
  'video/x-msvideo',
  'video/x-sgi-movie',
];

export function isVideo(filenameOrExtension: string): boolean {
  const mimeType = getMimeTypeForFile(filenameOrExtension);
  return SUPPORTED_MIME.includes(mimeType ?? '');
}
