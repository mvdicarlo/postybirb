import { ISubmissionFileWithArray } from 'src/app/database/tables/submission-file.table';
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
  log?: any;
  msg?: string;
  time: string;
  srcURL?: string;
}

export interface SubmissionPostData {
  title: string;
  additionalFiles: ISubmissionFileWithArray[];
  description: string;
  loginInformation: WebsiteStatus;
  options: any;
  primary: ISubmissionFileWithArray;
  profileId: string;
  srcURLs: string[];
  tags: string[];
  thumbnail: ISubmissionFileWithArray;
  typeOfSubmission: TypeOfSubmission;
}

export interface WebsiteService {
  readonly BASE_URL: string
  checkStatus(profileId: string, data?: any): Promise<WebsiteStatus>;
  post(submission: Submission, postData: SubmissionPostData): Promise<PostResult>;
  refreshTokens?(profileId: string, data?: any): Promise<WebsiteStatus>;
  resetCookies(profileId: string, url?: string): Promise<void>;
}
