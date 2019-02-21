import { ISubmissionFile } from 'src/app/database/tables/submission-file.table';
import { Submission } from 'src/app/database/models/submission.model';
import { TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';

export enum LoginStatus {
  LOGGED_IN = 1,
  LOGGED_OUT = 0
}

export interface WebsiteStatus {
  username: string,
  status: LoginStatus
}

export interface PostResult {
  success: boolean;
  error?: any;
  msg?: string;
  time: string;
  srcURL?: string;
}

export interface SubmissionPostData {
  additionalFiles: ISubmissionFile[];
  description: string;
  loginInformation: WebsiteStatus;
  options: any;
  primary: ISubmissionFile;
  profileId: string;
  srcURLs: string[];
  tags: string[];
  thumbnail: ISubmissionFile;
  typeOfSubmission: TypeOfSubmission;
}

export interface WebsiteService {
  readonly BASE_URL: string
  checkStatus(profileId: string): Promise<WebsiteStatus>;
  post(submission: Submission, postData: SubmissionPostData): Promise<PostResult>;
}
