import { SubmissionData } from '../../posty-birb/interfaces/submission-data.interface';
import { FileObject } from './file-obect.interface';

/**
 * @interface
 * Interface specifying the object that is passed into the post method for Website interfaces
 */
export interface PostyBirbSubmissionData {
  description: string;
  parseDescription: boolean;
  defaultTags: string[];
  customTags: string[];
  options: any;
  submissionData: SubmissionData;
}
