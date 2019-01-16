import { FileObject } from '../../commons/interfaces/file-obect.interface';
import { SubmissionType } from '../enums/submission-type.enum';

export class FileHandler {
  private static acceptedFileTypes: any = {
    Story: ['txt', 'pdf', 'doc', 'docx', 'rtf', 'odt', 'md'],
    Artwork: ['png', 'jpeg', 'jpg', 'gif', 'bmp', 'tif', 'tiff'],
    Music: ['mp3', 'mid', 'wav', 'wav', 'mpeg'],
    Animation: ['swf', 'flv', 'webm', 'mp4'],
  };

  public static getTypeByExtension(file: any): string {
    if (!file) return 'Artwork'; // should only really happen on a templates

    const fileExtension = file.name.split('.').pop().toLowerCase();

    for (let key in this.acceptedFileTypes) {
      const type = this.acceptedFileTypes[key];
      if (type.indexOf(fileExtension) !== -1) {
        return key;
      }
    }

    return this.guessFromMimeType(file);
  }

  public static guessFromMimeType(file: File | FileObject): string {
    if (file.type.includes('image')) return SubmissionType.ARTWORK;
    if (file.type.includes('audio')) return SubmissionType.MUSIC;
    if (file.type.includes('video')) return SubmissionType.ANIMATION;
    if (file.type.includes('text')) return SubmissionType.STORY;

    alert('Unknown/unsupported file type');
  }
}
