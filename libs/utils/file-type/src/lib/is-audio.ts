import { getMimeTypeForFile } from './mime-helper';

const SUPPORTED_MIME: string[] = [
  'audio/3gpp',
  'audio/3gpp2',
  'audio/aac',
  'audio/ac3',
  'audio/adpcm',
  'audio/aiff',
  'audio/x-aiff',
  'audio/amr',
  'audio/amr-wb',
  'audio/basic',
  'audio/flac',
  'audio/x-flac',
  'audio/midi',
  'audio/x-midi',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/mpeg3',
  'audio/x-mpeg-3',
  'audio/m4a',
  'audio/x-m4a',
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
  'audio/vnd.rip',
  'audio/vnd.wave',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/webm',
  'audio/x-aac',
  'audio/x-caf',
  'audio/x-matroska',
  'audio/x-mpegurl',
  'audio/x-ms-wax',
  'audio/x-ms-wma',
  'audio/x-pn-realaudio',
  'audio/x-pn-realaudio-plugin',
  'audio/x-realaudio',
];

export function supportsAudio(mimeType: string): boolean {
  return SUPPORTED_MIME.includes(mimeType);
}

export function isAudio(filenameOrExtension: string): boolean {
  const mimeType = getMimeTypeForFile(filenameOrExtension);
  return (
    SUPPORTED_MIME.includes(mimeType ?? '') ||
    supportsAudio(filenameOrExtension)
  );
}
