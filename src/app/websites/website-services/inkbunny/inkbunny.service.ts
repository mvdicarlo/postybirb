import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { BBCodeParser } from 'src/app/utils/helpers/description-parsers/bbcode.parser';
import { BaseWebsiteService } from '../base-website-service';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { InkbunnyLoginDialog } from './components/inkbunny-login-dialog/inkbunny-login-dialog.component';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { InkbunnySubmissionForm } from './components/inkbunny-submission-form/inkbunny-submission-form.component';
import { SubmissionType, SubmissionRating } from 'src/app/database/tables/submission.table';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const supportedFiles: string[] = ['png', 'jpeg', 'jpg', 'gif', 'swf', 'flv', 'mp4', 'doc', 'rtf', 'txt', 'mp3'];

  if (!supportsFileType(submission.fileInfo, supportedFiles)) {
    problems.push(['Does not support file format', { website: 'InkBunny', value: submission.fileInfo.type }]);
  }

  if (submission.additionalFileInfo && submission.additionalFileInfo.length) {
    submission.additionalFileInfo
      .filter(info => !supportsFileType(info, supportedFiles))
      .forEach(info => problems.push(['Does not support file format', { website: 'InkBunny', value: info.type }]));
  }

  if (MBtoBytes(200) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: `InkBunny`, value: '200MB' }]);
  }

  return problems;
}

function usernameParser(html: string): string {
  if (!html) return '';
  html = html.replace(/:fa(.*?):/gi, `[fa]$1[/fa]`);
  html = html.replace(/:sf(.*?):/gi, `[sf]$1[/sf]`);
  html = html.replace(/:da(.*?):/gi, `[da]$1[/da]`);
  html = html.replace(/:ws(.*?):/gi, `[w]$1[/w]`);
  html = html.replace(/:ib(.*?):/gi, `[iconname]$1[/iconname]`);

  return html;
}

function bbcodeParse(bbcode: string): string {
  if (!bbcode) return '';
  return bbcode.replace(/\[hr\]/g, '-----');
}

@Injectable({
  providedIn: 'root'
})
@Website({
  additionalFiles: true,
  displayedName: 'InkBunny',
  login: {
    dialog: InkbunnyLoginDialog,
    url: 'https://inkbunny.net'
  },
  components: {
    submissionForm: InkbunnySubmissionForm,
  },
  validators: {
    submission: submissionValidate
  },
  preparsers: {
    description: [usernameParser]
  },
  parsers: {
    description: [BBCodeParser.parse, bbcodeParse],
    usernameShortcut: {
      code: 'ib',
      url: 'https://inkbunny.net/$1'
    }
  }
})
export class InkBunny extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://inkbunny.net';

  constructor(private _profileManager: LoginProfileManagerService) {
    super();
  }

  public async checkStatus(profileId: string, data?: any): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    if (data) {
      const formData: any = {
        sid: data.sid,
        limit: 5
      };
      const response = await got.post(`${this.BASE_URL}/api_watchlist.php`, formData, this.BASE_URL, [], profileId);
      try {
        if (!response.error) {
          const body: any = JSON.parse(response.success.body);
          if (!body.error_code) {
            returnValue.status = LoginStatus.LOGGED_IN;
            returnValue.username = data.username;
          }
        }

      } catch (e) { /* No important error handling */ }
    }

    if (returnValue.status === LoginStatus.LOGGED_OUT) {
      this.unauthorize(profileId);
    }

    return returnValue;
  }

  public async authorize(data: { username: string, password: string }, profileId: string): Promise<boolean> {
    const response = await got.get(`${this.BASE_URL}/api_login.php?username=${data.username}&password=${encodeURIComponent(data.password)}`, this.BASE_URL, [], profileId);
    const body: any = JSON.parse(response.body);
    if (body.sid) {
      this._profileManager.storeData(profileId, InkBunny.name, {
        sid: body.sid,
        username: data.username,
        user_id: body.user_id
      });

      return true;
    }

    return false;
  }

  public unauthorize(profileId: string): void {
    this._profileManager.storeData(profileId, InkBunny.name, null);
  }

  private _getRating(rating: SubmissionRating): any {
    if (rating === SubmissionRating.GENERAL) return '0';
    if (rating === SubmissionRating.MATURE) return '2';
    if (rating === SubmissionRating.EXTREME || rating === SubmissionRating.ADULT) return '4';
    return 0;
  }

  public post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    if (submission.submissionType === SubmissionType.SUBMISSION) {
      return this.postSubmission(submission, postData);
    } else if (submission.submissionType === SubmissionType.JOURNAL) {
      return this.postJournal(submission, postData);
    } else {
      throw new Error('Unknown submission type.');
    }
  }

  private async postJournal(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    // TODO: The old way of doing this was janky and I would rather wait for their API to support it
    return null;
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const authData = this._profileManager.getData(postData.profileId, InkBunny.name);
    if (authData) {
      const data: any = {
        sid: authData.sid,
        'uploadedfile[0]': fileAsFormDataObject(postData.primary),
      };

      if (postData.thumbnail) {
        data['uploadedthumbnail[]'] = fileAsFormDataObject(postData.thumbnail);
      }

      for (let i = 0; i < postData.additionalFiles.length; i++) {
        const file = postData.additionalFiles[i];
        data[`uploadedfile[${i + 1}]`] = fileAsFormDataObject(file);
      }

      const uploadResponse = await got.post(`${this.BASE_URL}/api_upload.php`, data, this.BASE_URL, []);
      if (uploadResponse.error) {
        return Promise.reject(this.createPostResponse('Unknown error', uploadResponse.error));
      }

      const responseBody = JSON.parse(uploadResponse.success.body);
      if (!(responseBody.sid && responseBody.submission_id)) {
        return Promise.reject(this.createPostResponse(responseBody.error_code, responseBody));
      }

      const editData: any = {
        sid: authData.sid,
        submission_id: responseBody.submission_id,
        title: postData.title,
        desc: postData.description,
        keywords: this.formatTags(postData.tags, []),
      };

      const options = postData.options;

      const rating = this._getRating(submission.rating);
      if (rating !== 0 || options.rating) {
        editData[`tag[${options.rating || rating}]`] = 'yes'; // use the one specified by user if provided, otherwise use default rating
      }

      if (options.scraps) editData.scraps = 'yes';
      if (!options.notify) editData.visibility = 'yes_nowatch';
      else editData.visibility = 'yes';

      if (options.blockGuests) editData.guest_block = 'yes';
      if (options.friendsOnly) editData.friends_only = 'yes';

      const postResponse = await got.post(`${this.BASE_URL}/api_editsubmission.php`, editData, this.BASE_URL, []);
      if (postResponse.error) {
        return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
      }

      const postBody = JSON.parse(postResponse.success.body);
      if (postBody.error_code || !postBody.submission_id) {
        return Promise.reject(this.createPostResponse(postBody.error_code, postBody));
      } else {
        const res = this.createPostResponse(null);
        res.srcURL = `${this.BASE_URL}/s/${postBody.submission_id}`;
        return res;
      }
    }

    return Promise.reject(this.createPostResponse('Unknown error', { custom: 'Potentially not logged in?' }));
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const tags = [...defaultTags, ...other];
    return tags.map((tag) => {
      return tag.trim().replace(/\s/gm, '_').replace(/\\/gm, '/');
    }).join(',').trim();
  }

}
