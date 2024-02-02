import { getMimeTypeForFile } from './mime-helper';

const SUPPORTED_MIME: string[] = [
  'audio/3gpp',
  'audio/3gpp2',
  'audio/adpcm',
  'audio/aiff',
  'audio/x-aiff',
  'audio/basic',
  'audio/flac',
  'audio/x-flac',
  'audio/midi',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/mpeg3',
  'audio/x-mpeg-3',
  'audio/ogg',
  'audio/opus',
  'audio/vnd.digital-winds',
  'audio/vnd.dts',
  'audio/vnd.dts.hd',
  'audio/vnd.lucent.voice',
  'audio/vnd.ms-playready.media.pya',
  'audio/vnd.nuera.ecelp4800',
  'audio/vnd.nuera.ecelp7470',
  'audio/vnd.nuera.ecelp9600',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/x-aac',
  'audio/x-aiff',
  'audio/x-matroska',
  'audio/x-mpegurl',
  'audio/x-ms-wax',
  'audio/x-ms-wma',
  'audio/x-pn-realaudio',
  'audio/x-pn-realaudio-plugin',
  'audio/3gpp',
  'audio/3gpp2',
];

export function isAudio(filenameOrExtension: string): boolean {
  const mimeType = getMimeTypeForFile(filenameOrExtension);
  return SUPPORTED_MIME.includes(mimeType ?? '');
}
