import { WebsiteService, WebsiteStatus, SubmissionPostData, PostResult } from '../interfaces/website-service.interface';
import { FolderCategory } from '../interfaces/folder.interface';
import { Submission } from 'src/app/database/models/submission.model';

export interface UserInformation {
  folders?: FolderCategory[];
}

export class BaseWebsiteService implements WebsiteService {
  BASE_URL: string;
  protected userInformation: Map<string, UserInformation> = new Map();

  protected createPostResponse(msg: string, error?: any): PostResult {
    return { msg, error, success: error === undefined, time: (new Date()).toLocaleString() };
  }

  checkStatus(profileId: string): Promise<WebsiteStatus> {
    throw new Error("Method not implemented.");
  }

  getFolders(profileId: string): FolderCategory[] {
    throw new Error("Method not implemented.");
  }

  protected formatTags(defaultTags: string[] = [], other: string[] = [], spaceReplacer: string = '_'): any {
    const tags = [...defaultTags, ...other];
    return tags.map((tag) => {
      return tag.trim()
        .replace(/\s/gm, spaceReplacer)
        .replace(/(\/|\\)/gm, spaceReplacer);
    });
  }

  post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    throw new Error("Method not implemented.");
  }

}
