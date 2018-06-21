import { FileObject } from '../../commons/interfaces/file-obect.interface';
import { FileInformation } from '../../commons/models/file-information';

export interface SubmissionData {
  title: string;
  submissionFile: any | FileObject;
  submissionFileInfo?: any | FileObject;
  thumbnailFile?: any | FileObject;
  thumbnailFileInfo?: FileInformation | FileObject;
  additionalFiles?: Array<any | FileInformation | FileObject>;
  submissionType: string;
  submissionRating: string;
}
