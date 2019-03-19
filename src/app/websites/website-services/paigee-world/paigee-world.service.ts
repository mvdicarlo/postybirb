import { Injectable } from '@angular/core';
import { PaigeeWorldSubmissionForm } from './components/paigee-world-submission-form/paigee-world-submission-form.component';
import { Website } from '../../decorators/website-decorator';
import { MBtoBytes, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { SubmissionFormData, Submission } from 'src/app/database/models/submission.model';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { BaseWebsiteService } from '../base-website-service';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  if (!supportsFileType(submission.fileInfo, ['png', 'jpeg', 'jpg', 'gif'])) {
    problems.push(['Does not support file format', { website: 'Paigee World', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(50) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'Paigee World', value: '50MB' }]);
  }

  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  displayedName: 'Paigee World',
  login: {
    url: 'https://www.paigeeworld.com/login'
  },
  components: {
    submissionForm: PaigeeWorldSubmissionForm,
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [PlaintextParser.parse],
    usernameShortcut: {
      code: 'pw',
      url: 'https://www.paigeeworld.com/u/$1'
    }
  }
})
export class PaigeeWorld extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://www.paigeeworld.com';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const bearer = await this.getBearerToken(profileId);
    const response = await got.get(`${this.BASE_URL}/currentuser`, this.BASE_URL, cookies, profileId, {
      headers: {
        Authorization: bearer
      },
      responseType: 'json'
    });

    try {
      const res = JSON.parse(response.body);
      if (res.username) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = res.username;
      }
    } catch (e) { /* Nothing to do with this */ }

    return returnValue;
  }

  private getBearerToken(profileId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          partition: `persist:${profileId}`
        }
      });
      win.loadURL(`${this.BASE_URL}/login`);
      win.once('ready-to-show', () => {
        if (win.isDestroyed()) {
          reject(false);
          return;
        }

        win.webContents.executeJavaScript(`localStorage.authToken`).then(function(value) {
          this.userInformation.set(profileId, { bearer: value });
          win.destroy();
          resolve(value);
        }.bind(this));
      });
    });
  }

  public async post(_submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const bearer = await this.getBearerToken(postData.profileId);

    const data: any = {
      image: fileAsFormDataObject(postData.primary),
      captions: (postData.description || '').substring(0, 1000),
      extra_tags: this.formatTags(postData.tags, []).join(','),
      tags: this.formatTags(postData.tags, ['', postData.options.category]).join(','),
      web: '1',
      category: postData.options.category || ''
    };

    const postResponse = await got.post(`${this.BASE_URL}/media`, data, this.BASE_URL, cookies, {
      headers: {
        Authorization: bearer,
      }
    });

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    const json = JSON.parse(postResponse.success.body);
    if (json.status === 'OK') {
      return this.createPostResponse(null);
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', json));
    }
  }

}
