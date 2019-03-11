import { Injectable } from '@angular/core';
import { BaseWebsiteService } from '../base-website-service';
import { GenericSubmissionForm } from '../../components/generic-submission-form/generic-submission-form.component';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { Website } from '../../decorators/website-decorator';
import { TwitterLoginDialog } from './components/twitter-login-dialog/twitter-login-dialog.component';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { GenericJournalSubmissionForm } from '../../components/generic-journal-submission-form/generic-journal-submission-form.component';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes, isGIF } from 'src/app/utils/helpers/file.helper';
import { TwitterSubmissionForm } from './components/twitter-submission-form/twitter-submission-form.component';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];

  if (!supportsFileType(submission.fileInfo, ['jpeg', 'jpg', 'png', 'gif', 'webp'])) {
    problems.push(['Does not support file format', { website: 'Twitter', value: submission.fileInfo.type }]);
  }

  if (isGIF(submission.fileInfo)) {
    if (MBtoBytes(15) < submission.fileInfo.size) {
      problems.push(['Max file size', { website: 'Twitter (GIF)', value: '15MB' }]);
    }
  } else {
    if (MBtoBytes(5) < submission.fileInfo.size) {
      problems.push(['Max file size', { website: 'Twitter (Non-GIF)', value: '5MB' }]);
    }
  }

  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  additionalImages: true,
  login: {
    dialog: TwitterLoginDialog,
    url: 'https://twitter.com/'
  },
  components: {
    submissionForm: TwitterSubmissionForm,
    journalForm: TwitterSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [PlaintextParser.parse],
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
    const data: any = {
      status: `${options.useTitle ? submission.title + '\n\n' : ''}${postData.description}`.substring(0, 280),
      medias: [postData.primary, ...postData.additionalFiles].map(f => {
        return {
          buffer: Buffer.from(f.buffer).toString('base64'),
          type: f.fileInfo.type
        };
      }).slice(0, 4),
      token: authData.token,
      secret: authData.secret
    };

    const postResponse = await got.post(`${AUTH_URL}/twitter/post`, null, this.BASE_URL, [], {
      json: {
        data: Buffer.from(JSON.stringify(data)).toString('base64')
      }
    });
    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    if (postResponse.success.response.statusCode === 200) {
      return this.createPostResponse(null);
    } else {
      let message = 'Unknown error';
      try {
        message = JSON.parse(postResponse.success.body.e.data).errors.map(err => err.message).join('\n');
      } catch (e) {/*Swallow*/}
      return Promise.reject(this.createPostResponse(message, postResponse.success.body));
    }
  }
}
