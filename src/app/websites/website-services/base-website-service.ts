import { WebsiteService, WebsiteStatus, SubmissionPostData, PostResult, LoginStatus } from '../interfaces/website-service.interface';
import { Folder } from '../interfaces/folder.interface';
import { Submission } from 'src/app/database/models/submission.model';

export interface UserInformation {
  folders?: Folder[];
}

export class BaseWebsiteService implements WebsiteService {
  BASE_URL: string;
  protected userInformation: Map<string, UserInformation | any> = new Map();

  protected createPostResponse(msg: string, error?: any): PostResult {
    return { msg, error, success: error === undefined, time: (new Date()).toLocaleString() };
  }

  checkStatus(profileId: string): Promise<WebsiteStatus> {
    return Promise.reject({
      username: null,
      status: LoginStatus.LOGGED_OUT
    });
  }

  getFolders(profileId: string): Folder[] {
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

  protected attemptSessionLoad(profileId: string, url?: string): Promise<void> {
    return new Promise((resolve) => {
      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          partition: `persist:${profileId}`
        }
      });
      win.loadURL(url || this.BASE_URL);
      win.once('ready-to-show', () => {
        if (win.isDestroyed()) {
          resolve();
          return;
        }

        win.destroy();
        resolve();
      });
    });
  }

  public resetCookies(profileId: string, url?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cookieURL: string = url || this.BASE_URL;
      const sessionCookies: any = getCookieAPI(profileId);
      if (sessionCookies) {
        // get cookies
        sessionCookies.get({ url: cookieURL }, (err, cookies) => {
          if (err) {
            reject(err);
            return;
          }

          // iterate over cookies and remove
          const promises: Promise<any>[] = [];
          for (let i = 0; i < cookies.length; i++) {
            promises.push(new Promise((resolve) => {
              sessionCookies.remove(cookieURL, cookies[i].name, () => resolve());
            }));
          }

          Promise.all(promises).finally(() => resolve());
        });
      }
    });
  }

}
