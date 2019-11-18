import { FileObject } from 'src/app/database/tables/submission-file.table';

export enum TypeOfSubmission {
  ART = 'ART',
  STORY = 'STORY',
  AUDIO = 'AUDIO',
  ANIMATION = 'ANIMATION'
}

export const TypeMapping: any = {
  [TypeOfSubmission.ART]: ['image'],
  [TypeOfSubmission.STORY]: ['pdf', 'text', 'rtf', 'doc', 'docx', 'odt', 'md', 'html', 'log'],
  [TypeOfSubmission.AUDIO]: ['mp3', 'mid', 'wav', 'wav', 'mpeg'],
  [TypeOfSubmission.ANIMATION]: ['swf', 'flv', 'webm', 'mp4']
}

export function getTypeByExtension(file: File|FileObject): any {
  const extension = file.type.split('.').pop();
  for (let key of Object.keys(TypeMapping)) {
      const accepted = TypeMapping[key];
      if (accepted.includes(extension)) {
        return key;
      }
  }

  return null;
}

export function getTypeOfSubmission(file: File|FileObject): any {
  if (supportsFileType(file, TypeMapping[TypeOfSubmission.ART])) return TypeOfSubmission.ART;
  if (supportsFileType(file, TypeMapping[TypeOfSubmission.STORY])) return TypeOfSubmission.STORY;
  if (supportsFileType(file, TypeMapping[TypeOfSubmission.AUDIO])) return TypeOfSubmission.AUDIO;
  if (supportsFileType(file, TypeMapping[TypeOfSubmission.ANIMATION])) return TypeOfSubmission.ANIMATION;

  return getTypeByExtension(file) || null;
}

function supportsFileType(fileInfo: File|FileObject, supportedFileTypes: string[]): boolean {
  const split = fileInfo.type.split('/')[1];
  let extension = null;
  if (fileInfo.name) {
    extension = fileInfo.name.split('.').pop();
  }
  for (let i = 0; i < supportedFileTypes.length; i++) {
    if (fileInfo.type && supportedFileTypes[i].includes(fileInfo.type) || split && supportedFileTypes[i].includes(split)) {
      return true;
    } else {
      if (extension && supportedFileTypes[i].includes(extension)) {
        return true;
      }
    }
  }

  return false;
}
