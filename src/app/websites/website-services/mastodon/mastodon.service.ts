import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { supportsFileType, getDescription } from '../../helpers/website-validator.helper';
import { MBtoBytes, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { MastodonLoginDialog } from './components/mastodon-login-dialog/mastodon-login-dialog.component';
import { BaseWebsiteService } from '../base-website-service';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { MastodonSubmissionForm } from './components/mastodon-submission-form/mastodon-submission-form.component';
import { SubmissionRating } from 'src/app/database/tables/submission.table';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const supportedFiles: string[] = ['png', 'jpeg', 'jpg', 'gif', 'swf', 'flv', 'mp4', 'doc', 'rtf', 'txt', 'mp3'];

  if (!supportsFileType(submission.fileInfo, supportedFiles)) {
    problems.push(['Does not support file format', { website: 'Mastodon', value: submission.fileInfo.type }]);
  }

  if (submission.additionalFileInfo && submission.additionalFileInfo.length) {
    submission.additionalFileInfo
      .filter(info => !supportsFileType(info, supportedFiles))
      .forEach(info => problems.push(['Does not support file format', { website: 'Mastodon', value: info.type }]));
  }

  if (MBtoBytes(300) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'Mastodon', value: '300MB' }]);
  }

  return problems;
}

function warningCheck(submission: Submission, formData: SubmissionFormData): string {
  const description: string = PlaintextParser.parse(getDescription(submission, Mastodon.name) || '');
  if (description && description.length > 500) {
    return Mastodon.name;
  }

  return null;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  additionalFiles: true,
  login: {
    dialog: MastodonLoginDialog,
    url: ''
  },
  components: {
    submissionForm: MastodonSubmissionForm,
    journalForm: MastodonSubmissionForm
  },
  validators: {
    warningCheck,
    submission: submissionValidate
  },
  parsers: {
    description: [PlaintextParser.parse],
    disableAdvertise: true,
  }
})
export class Mastodon extends BaseWebsiteService {

  constructor(private _profileManager: LoginProfileManagerService) {
    super();
  }

  public async checkStatus(profileId: string, data?: any): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    if (data) {
      const refresh = await auth.mastodon.refresh(data.website, data.token);
      if (refresh) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = data.username;
      } else {
        this.unauthorize(profileId);
      }
    } else {
      this.unauthorize(profileId);
    }

    return returnValue;
  }

  public unauthorize(profileId: string): void {
    this._profileManager.storeData(profileId, Mastodon.name, null);
  }

  public async post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const authData = this._profileManager.getData(postData.profileId, Mastodon.name);
    let sensitive: boolean = submission.rating === SubmissionRating.ADULT || submission.rating === SubmissionRating.EXTREME;
    if (postData.options.sensitiveOverride !== null) {
      sensitive = postData.options.sensitiveOverride === 'yes';
    }
    const postResponse: any = await auth.mastodon.post(
      authData.token,
      authData.website,
      [postData.primary, ...postData.additionalFiles].filter(f => !!f).map(f => fileAsFormDataObject(f)),
      sensitive,
      `${postData.options.useTitle ? postData.title + '\n' : ''}${postData.description}`.substring(0, 490).trim(), // substr 500 seems to cause issue
      postData.options.spoilerText
    );

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse(postResponse.error, postResponse.error))
    }

    const res = this.createPostResponse(null);
    res.srcURL = postResponse.url;
    return res;
  }
}
