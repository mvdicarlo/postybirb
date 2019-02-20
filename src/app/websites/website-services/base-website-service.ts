import { WebsiteService, WebsiteStatus } from '../interfaces/website-service.interface';
import { FolderCategory } from '../interfaces/folder.interface';

export interface UserInformation {
  folders?: FolderCategory[];
}

export class BaseWebsiteService implements WebsiteService {
  BASE_URL: string;
  protected userInformation: Map<string, UserInformation> = new Map();

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

}
