import { FileObject } from 'src/app/database/tables/submission-file.table';

export enum TypeOfSubmission {
  ART = 'ART',
  STORY = 'STORY',
  AUDIO = 'AUDIO',
  ANIMATION = 'ANIMATION'
}

const TypeMapping: any = {
  [TypeOfSubmission.ART]: ['image'],
  [TypeOfSubmission.STORY]: ['pdf', 'text', 'rtf', 'doc', 'docx', 'odt', 'md'],
  [TypeOfSubmission.AUDIO]: ['mp3', 'mid', 'wav', 'wav', 'mpeg'],
  [TypeOfSubmission.ANIMATION]: ['swf', 'flv', 'webm', 'mp4']
}

export function getTypeOfSubmission(file: File|FileObject): TypeOfSubmission {
  const type: string[] = file.type.split('/');
  for (let key of TypeMapping) {
      const accepted = TypeMapping[key];
      if (accepted.includes(type[0]) || accepted.includes(type[1])) {
        return key;
      }
  }

  return null;
}
