import { FileObject } from 'src/app/database/tables/submission-file.table';

export enum TypeOfSubmission {
  ART = 'ART',
  STORY = 'STORY',
  AUDIO = 'AUDIO',
  ANIMATION = 'ANIMATION'
}

const TypeMapping: any = {
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
  const type: string[] = file.type.split('/');
  for (let key of Object.keys(TypeMapping)) {
      const accepted = TypeMapping[key];
      if (accepted.includes(type[0]) || accepted.includes(type[1])) {
        return key;
      }
  }

  return getTypeByExtension(file) || null;
}
