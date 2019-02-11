import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { WebsiteService, WebsiteStatus, LoginStatus } from '../../interfaces/website-service.interface';
import { WeasylSubmissionForm } from './components/weasyl-submission-form/weasyl-submission-form.component';
import { Submission } from 'src/app/database/models/submission.model';
import { getTags } from '../../helpers/website-validator.helper';
import { Folder, FolderCategory } from '../../interfaces/folder.interface';
import { BaseWebsiteService } from '../base-website-service';

function submissionValidate(submission: Submission, formData: any): string[] {
  const problems: string[] = [];
  const tags = getTags(submission, Weasyl.name);
  if (tags.length < 2) problems.push('Weasyl is incomplete');
  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  login: {
    url: 'https://www.weasyl.com/signin'
  },
  components: {
    submissionForm: WeasylSubmissionForm
  },
  validators: {
    submission: submissionValidate
  }
})
export class Weasyl extends BaseWebsiteService implements WebsiteService {
  readonly BASE_URL: string = 'https://www.weasyl.com';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/api/whoami`, this.BASE_URL, cookies);
    try {
      const body = JSON.parse(response.body);
      if (body.login) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = body.login;
        await this._updateUserInformation(profileId, body.login);
      } else {
        this.userInformation.delete(profileId);
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  private async _updateUserInformation(profileId: string, loginName: string): Promise<void> {
    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/api/users/${loginName}/view`, this.BASE_URL, cookies);
    try {
      const info = JSON.parse(response.body);
      if (info) {
        this.userInformation.set(profileId, info);
      }
    } catch (e) { /* No important error handling */ }

    return;
  }

  public getFolders(profileId: string): FolderCategory[] {
    const folders: Folder[] = [];
    if (this.userInformation.has(profileId)) {
      const data: any = this.userInformation.get(profileId) || {};
      if (data.folders) {
        for (let i = 0; i < data.folders.length; i++) {
          const folder = data.folders[i];
          const _folder: Folder = {
            title: folder.title,
            id: folder.folder_id,
            subfolders: []
          };

          folders.push(_folder);

          if (folder.subfolders) {
            for (let j = 0; j < folder.subfolders.length; j++) {
              const subfolder = folder.subfolders[j];
              const _subfolder: Folder = {
                title: `${_folder.title} / ${subfolder.title}`,
                id: subfolder.folder_id,
                subfolders: []
              }

              _folder.subfolders.push(_subfolder);
              folders.push(_subfolder);
            }
          }
        }
      }
    }

    return [{
      title: 'Folders',
      folders
    }];
  }
}
