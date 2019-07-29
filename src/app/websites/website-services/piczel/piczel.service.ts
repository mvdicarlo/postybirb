import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { BaseWebsiteService } from '../base-website-service';
import { MBtoBytes } from 'src/app/utils/helpers/file.helper';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { Folder } from '../../interfaces/folder.interface';
import { PiczelSubmissionForm } from './components/piczel-submission-form/piczel-submission-form.component';
import { SubmissionRating } from 'src/app/database/tables/submission.table';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const supportedFiles: string[] = ['png', 'jpeg', 'jpg', 'gif'];
  
  if (!supportsFileType(submission.fileInfo, supportedFiles)) {
    problems.push(['Does not support file format', { website: 'Piczel', value: submission.fileInfo.type }]);
  }

  if (submission.additionalFileInfo && submission.additionalFileInfo.length) {
    submission.additionalFileInfo
      .filter(info => !supportsFileType(info, supportedFiles))
      .forEach(info => problems.push(['Does not support file format', { website: 'Piczel', value: info.type }]));
  }

  if (MBtoBytes(30) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'Piczel', value: '30MB' }]);
  }

  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  additionalFiles: true,
  login: {
    url: 'https://piczel.tv/login'
  },
  components: {
    submissionForm: PiczelSubmissionForm,
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [],
    usernameShortcut: {
      code: 'pz',
      url: 'https://piczel.tv/gallery/$1'
    }
  }
})
export class Piczel extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://piczel.tv';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/gallery/upload`, this.BASE_URL, cookies, profileId);
    try {
      const body = response.body;
      if (!body.includes('/signup')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = body.match(/"username":".*?"/g)[0].split(':')[1].replace(/"/g, '');

        const userData = JSON.parse(body.match(/\{(.*?)\}\}/)[0]);
        const info = this.userInformation.get(profileId) || {};
        info.userData = userData;
        this.userInformation.set(profileId, info);

        this._getFolders(returnValue.username, cookies, profileId);
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  private async _getFolders(username: string, cookies: any[], profileId: string): Promise<void> {
    const response = await got.get(`${this.BASE_URL}/api/users/${username}/gallery/folders`, this.BASE_URL, cookies, profileId);

    const folders: Folder[] = [{
      id: undefined,
      title: 'None'
    }];
    const data: any[] = JSON.parse(response.body) || [];
    data.forEach(folder => {
      folders.push({
          id: folder.id,
          title: folder.name
      });
    });

    const info = this.userInformation.get(profileId) || {};
    info.folders = folders;
    this.userInformation.set(profileId, info);
  }

  public getFolders(profileId: string): Folder[] {
    return (this.userInformation.get(profileId) || <any>{}).folders || [];
  }

  public async post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);

    const options = postData.options;
    const forceNSFWRating: boolean = submission.rating === SubmissionRating.ADULT || submission.rating === SubmissionRating.EXTREME ? true : false;
    const data: any = {
      nsfw: forceNSFWRating || options.nsfw,
      description: postData.description,
      title: postData.title || 'New Submission',
      tags: this.formatTags(postData.tags || [], []),
      image: `data:${postData.primary.fileInfo.type};base64,${Buffer.from(postData.primary.buffer).toString('base64')}`
    };

    if (options.folder) {
      data.folder_id = options.folder;
    }

    const info = this.userInformation.get(postData.profileId) || {};
    const { userData } = info;
    const headers: any = {
      Accent: '*/*',
      client: userData.headers.client,
      expiry: userData.headers.expiry,
      'token-type': userData.headers['token-type'],
      uid: userData.headers.uid,
      Authorization: `${userData.headers['token-type']} ${userData.headers['access-token']}`,
      'access-token': userData.headers['access-token']
    };

    const postResponse = await got.post(`${this.BASE_URL}/api/gallery`, null, this.BASE_URL, cookies, {
      json: data,
      headers
    });

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    if (postResponse.success.body.id) {
      if (postData.additionalFiles && postData.additionalFiles.length) {
        for (let i = 0; i < postData.additionalFiles.length; i++) {
            const file = postData.additionalFiles[i];
            const d = {
              gallery_image_id: postResponse.success.body.id,
              image: `data:${file.fileInfo.type};base64,${Buffer.from(file.buffer).toString('base64')}`
            };

            const res = await got.post(`${this.BASE_URL}/api/gallery/plain`, null, this.BASE_URL, cookies, {
              json: d,
              headers
            });

            if (res.error) {
              console.error(res.error);
            }
        }
      } else {
        return this.createPostResponse(null);
      }
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body.errors.join(', ')));
    }
  }
}
