import { getMimeTypeForFile } from './mime-helper';

const SUPPORTED_MIME: string[] = [
  'text/json',
  'text/mathml',
  'text/x.gcode',
  'text/x-gcode',
  'text/calendar',
  'text/css',
  'text/csv',
  'text/html',
  'text/javascript',
  'text/ecmascript',
  'text/javascript1.0',
  'text/javascript1.1',
  'text/javascript1.2',
  'text/javascript1.3',
  'text/javascript1.4',
  'text/javascript1.5',
  'text/jscript',
  'text/livescript',
  'text/x-ecmascript',
  'text/x-javascript',
  'text/markdown',
  'text/x-markdown',
  'text/mathml',
  'text/plain',
  'text/prs.lines.tag',
  'text/richtext',
  'text/sgml',
  'text/tab-separated-values',
  'text/troff',
  'text/uri-list',
  'text/vnd.curl',
  'text/vnd.curl.dcurl',
  'text/vnd.curl.mcurl',
  'text/vnd.curl.scurl',
  'text/vnd.fly',
  'text/vnd.fmi.flexstor',
  'text/vnd.graphviz',
  'text/vnd.in3d.3dml',
  'text/vnd.in3d.spot',
  'text/vnd.sun.j2me.app-descriptor',
  'text/vnd.wap.si',
  'text/vnd.wap.sl',
  'text/vnd.wap.wml',
  'text/vnd.wap.wmlscript',
  'text/x-asm',
  'text/x-c',
  'text/x-fortran',
  'text/x-java-source',
  'text/x-pascal',
  'text/x-python',
  'text/x-setext',
  'text/x-uuencode',
  'text/x-vcalendar',
  'text/x-vcard',
  'application/pdf',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
];

export function supportsText(mimeType: string): boolean {
  return SUPPORTED_MIME.includes(mimeType);
}

export function isText(filenameOrExtension: string): boolean {
  const mimeType = getMimeTypeForFile(filenameOrExtension);
  return (
    SUPPORTED_MIME.includes(mimeType ?? '') || supportsText(filenameOrExtension)
  );
}
