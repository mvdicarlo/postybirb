import { Injectable } from '@angular/core';
import { BaseWebsiteService } from '../base-website-service';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { Website } from '../../decorators/website-decorator';
import { TwitterLoginDialog } from './components/twitter-login-dialog/twitter-login-dialog.component';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { supportsFileType, getDescription } from '../../helpers/website-validator.helper';
import { MBtoBytes, isGIF, isType } from 'src/app/utils/helpers/file.helper';
import { TwitterSubmissionForm } from './components/twitter-submission-form/twitter-submission-form.component';
import { SubmissionRating } from 'src/app/database/tables/submission.table';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const supportedFiles: string[] = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'mp4', 'mov'];

  if (!supportsFileType(submission.fileInfo, supportedFiles)) {
    problems.push(['Does not support file format', { website: 'Twitter', value: submission.fileInfo.type }]);
  }

  if (submission.additionalFileInfo && submission.additionalFileInfo.length) {
    submission.additionalFileInfo
      .filter(info => !supportsFileType(info, supportedFiles))
      .forEach(info => problems.push(['Does not support file format', { website: 'Twitter', value: info.type }]));
  }

  if (isGIF(submission.fileInfo)) {
    if (MBtoBytes(15) < submission.fileInfo.size) {
      problems.push(['Max file size', { website: 'Twitter (GIF)', value: '15MB' }]);
    }
  } else if (isType(submission.fileInfo, 'video')) {
    if (MBtoBytes(512) < submission.fileInfo.size) {
      problems.push(['Max file size', { website: 'Twitter (Video)', value: '512MB' }]);
    }
  } else {
    if (MBtoBytes(5) < submission.fileInfo.size) {
      problems.push(['Max file size', { website: 'Twitter (Non-GIF)', value: '5MB' }]);
    }
  }

  return problems;
}

function warningCheck(submission: Submission, formData: SubmissionFormData): string {
  const description: string = PlaintextParser.parse(descriptionParse(getDescription(submission, Twitter.name) || ''));
  if (description && description.length > 280) {
    return Twitter.name;
  }

  return null;
}

function descriptionParse(html: string): string {
  return html.replace(/:tw(.*?):/gi, `@$1`);
}

@Injectable({
  providedIn: 'root'
})
@Website({
  additionalFiles: true,
  login: {
    dialog: TwitterLoginDialog,
    url: 'https://twitter.com/'
  },
  components: {
    submissionForm: TwitterSubmissionForm,
    journalForm: TwitterSubmissionForm
  },
  validators: {
    warningCheck,
    submission: submissionValidate
  },
  preparsers: {
    description: [descriptionParse]
  },
  parsers: {
    description: [PlaintextParser.parse],
    disableAdvertise: true,
    usernameShortcut: {
      code: 'tw',
      url: 'https://twitter.com/$1'
    }
  }
})
export class Twitter extends BaseWebsiteService {

  constructor(private _profileManager: LoginProfileManagerService) {
    super();
  }

  public async checkStatus(profileId: string, data?: any): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    if (data) {
      returnValue.status = LoginStatus.LOGGED_IN;
      returnValue.username = data.username;
    }

    if (returnValue.status === LoginStatus.LOGGED_OUT) {
      this.unauthorize(profileId);
    }

    return returnValue;
  }

  public unauthorize(profileId: string): void {
    this._profileManager.storeData(profileId, Twitter.name, null);
  }

  public async post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const options = postData.options;
    const authData = this._profileManager.getData(postData.profileId, Twitter.name);
    let sensitive: boolean = submission.rating === SubmissionRating.ADULT || submission.rating === SubmissionRating.EXTREME;
    if (options.sensitiveOverride !== null) {
      sensitive = options.sensitiveOverride === 'yes';
    }
    const data: any = {
      status: `${options.useTitle ? postData.title + '\n\n' : ''}${postData.description}`,
      medias: [postData.primary, ...postData.additionalFiles].filter(f => !!f).map(f => {
        return {
          base64: Buffer.from(f.buffer).toString('base64'),
          type: f.fileInfo.type
        };
      }),
      token: authData.token,
      secret: authData.secret,
      sensitive
    };

    const postResponse = await got.post(`${AUTH_URL}/twitter/v1/post`, null, this.BASE_URL, [], {
      json: data
    });

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    if (!postResponse.success.body.errors) {
      return this.createPostResponse(null);
    } else {
      let message = 'Unknown error';
      if (postResponse.success.body.errors) {
        message = postResponse.success.body.errors.map(e => {
          if (e && e.response) return e.response;
          return e;
        }).join('\n') || 'Unknown error';
      }
      return Promise.reject(this.createPostResponse(message, postResponse.success.body));
    }
  }
}
