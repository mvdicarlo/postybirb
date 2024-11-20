import { getMimeTypeForFile } from './mime-helper';

// https://mimetype.io/all-types/#image
const SUPPORTED_MIME: string[] = [
  'image/avif',
  'image/bmp',
  'image/cgm',
  'image/g3fax',
  'image/gif',
  'image/heic',
  'image/ief',
  'image/jpeg',
  'image/pjpeg',
  'image/png',
  'image/x-png',
  'image/vnd.mozilla.apng',
  'image/prs.btif',
  'image/svg+xml',
  'image/tiff',
  'image/vnd.adobe.photoshop',
  'image/vnd.djvu',
  'image/vnd.dwg',
  'image/vnd.dxf',
  'image/vnd.fastbidsheet',
  'image/vnd.fpx',
  'image/vnd.fst',
  'image/vnd.fujixerox.edmics-mmr',
  'image/vnd.fujixerox.edmics-rlc',
  'image/vnd.ms-modi',
  'image/vnd.net-fpx',
  'image/vnd.wap.wbmp',
  'image/vnd.xiff',
  'image/webp',
  'image/x-adobe-dng',
  'image/x-canon-cr2',
  'image/x-canon-crw',
  'image/x-cmu-raster',
  'image/x-cmx',
  'image/x-epson-erf',
  'image/x-freehand',
  'image/x-fuji-raf',
  'image/x-icon',
  'image/x-kodak-dcr',
  'image/x-kodak-k25',
  'image/x-kodak-kdc',
  'image/x-minolta-mrw',
  'image/x-nikon-nef',
  'image/x-olympus-orf',
  'image/x-panasonic-raw',
  'image/x-pcx',
  'image/x-pentax-pef',
  'image/x-pict',
  'image/x-portable-anymap',
  'image/x-portable-bitmap',
  'image/x-portable-graymap',
  'image/x-portable-pixmap',
  'image/x-rgb',
  'image/x-sigma-x3f',
  'image/x-sony-arw',
  'image/x-sony-sr2',
  'image/x-sony-srf',
  'image/x-xbitmap',
  'image/x-xpixmap',
  'image/x-xwindowdump',
];

export function isImage(filenameOrExtension: string): boolean {
  const mimeType = getMimeTypeForFile(filenameOrExtension);
  return SUPPORTED_MIME.includes(mimeType ?? '');
}

export function supportsImage(mimeType: string): boolean {
  return SUPPORTED_MIME.includes(mimeType);
}
