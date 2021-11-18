import FileReference from '../../file/models/file-reference.model';
import SubmissionType from '../enums/submission-type.enum';
import BaseSubmission from './base-submission.model';

export default interface FileSubmission extends BaseSubmission {
  type: SubmissionType.FILE;
  file: FileReference;
  thumbnail?: FileReference;
  additional: FileReference[];
}
