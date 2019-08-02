import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { BaseWebsiteService } from '../base-website-service';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { MBtoBytes, isGIF } from 'src/app/utils/helpers/file.helper';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { getTypeOfSubmission, TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { TumblrLoginDialog } from './components/tumblr-login-dialog/tumblr-login-dialog.component';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { TumblrSubmissionForm } from './components/tumblr-submission-form/tumblr-submission-form.component';
import { SubmissionType, SubmissionRating } from 'src/app/database/tables/submission.table';
import { CustomHTMLParser } from 'src/app/utils/helpers/description-parsers/html.parser';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const supportedFiles: string[] = ['png', 'jpeg', 'jpg', 'gif', 'mp3', 'mp4'];

  if (submission.rating && (submission.rating === SubmissionRating.ADULT || submission.rating === SubmissionRating.EXTREME)) {
    problems.push(['Does not support rating', { website: 'Tumblr', value: submission.rating }]);
  }

  if (!supportsFileType(submission.fileInfo, supportedFiles)) {
    problems.push(['Does not support file format', { website: 'Tumblr', value: submission.fileInfo.type }]);
  }

  if (submission.additionalFileInfo && submission.additionalFileInfo.length) {
    submission.additionalFileInfo
      .filter(info => !supportsFileType(info, supportedFiles))
      .forEach(info => problems.push(['Does not support file format', { website: 'Tumblr', value: info.type }]));
  }

  const type: TypeOfSubmission = getTypeOfSubmission(submission.fileInfo);
  let maxSize: number = 10;
  if (type === TypeOfSubmission.ANIMATION) maxSize = 100;
  if (type === TypeOfSubmission.ART && isGIF(submission.fileInfo)) maxSize = 1;
  if (MBtoBytes(maxSize) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: `Tumblr [${type}${isGIF(submission.fileInfo) ? '/GIF' : ''}]`, value: `${maxSize}MB` }]);
  }

  return problems;
}

function descriptionParse(html: string): string {
  if (!html) return '';
  return CustomHTMLParser.parse(html
    .replace(/<p/gm, '<div')
    .replace(/<\/p>/gm, '</div>'));
}

@Injectable({
  providedIn: 'root'
})
@Website({
  additionalFiles: true,
  refreshInterval: 45 * 60000,
  login: {
    dialog: TumblrLoginDialog,
    url: ''
  },
  components: {
    submissionForm: TumblrSubmissionForm,
    journalForm: TumblrSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  preparsers: {
    description: [descriptionParse]
  },
  parsers: {
    description: [],
    usernameShortcut: {
      code: 'tu',
      url: 'https://$1.tumblr.com/'
    }
  }
})
export class Tumblr extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://tumblr.com';

  constructor(private _profileManager: LoginProfileManagerService) {
    super();
  }

  public async checkStatus(profileId: string, data?: any): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    if (data && data.user) {
      const refresh = await auth.tumblr.refresh(data.accessToken, data.accessSecret);
      if (refresh) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = refresh.user.name;
        this.userInformation.set(profileId, refresh.user);
      } else {
        this.unauthorize(profileId);
      }
    } else {
      this.unauthorize(profileId);
    }

    return returnValue;
  }

  public unauthorize(profileId: string): void {
    this._profileManager.storeData(profileId, Tumblr.name, null);
  }

  public getBlogs(profileId: string): string[] {
    if (this.userInformation.has(profileId)) {
      return this.userInformation.get(profileId).blogs.map(blog => blog.name);
    }

    return [];
  }

  private getPostType(type: TypeOfSubmission): any {
    if (type === TypeOfSubmission.ART) return 'photo';
    if (type === TypeOfSubmission.ANIMATION) return 'video';
    if (type === TypeOfSubmission.AUDIO) return 'audio';
    return 'photo';
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
    const authData = this._profileManager.getData(postData.profileId, Tumblr.name);

    const options = postData.options;
    const title = options.useTitle ? `<h1>${postData.title}</h1>` : '';
    const data: any = {
      token: authData.accessToken,
      secret: authData.accessSecret,
      title: title,
      blog: options.blog || this.userInformation.get(postData.profileId).blogs.find(blog => blog.primary).name,
      type: 'text',
      tags: this.formatTags(postData.tags, []),
      description: title + postData.description
    };

    // TODO I should really just update the post server to not suck anymore. Could be done a lot better I think now
    const postResponse = await got.post(`${AUTH_URL}/tumblr/v1/post`, null, this.BASE_URL, [], {
      json: data
    });

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    if (!postResponse.success.body) {
      return this.createPostResponse(null);
    } else {
      // I don't know what a failed response looks like off the top of my head
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body));
    }
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const authData = this._profileManager.getData(postData.profileId, Tumblr.name);

    const options = postData.options;
    const title = options.useTitle ? `<h1>${postData.title}</h1>` : '';
    const data: any = {
      token: authData.accessToken,
      secret: authData.accessSecret,
      title: title,
      blog: options.blog || this.userInformation.get(postData.profileId).blogs.find(blog => blog.primary).name,
      type: this.getPostType(postData.typeOfSubmission),
      tags: this.formatTags(postData.tags, []),
      description: title + postData.description,
      medias: [postData.primary, ...postData.additionalFiles].map(file => {
        return {
          base64: Buffer.from(file.buffer).toString('base64'),
          fileInfo: file.fileInfo
        };
      })
    };

    const postResponse = await got.post(`${AUTH_URL}/tumblr/v1/post`, null, this.BASE_URL, [], {
      json: data
    });

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    if (!postResponse.success.body) {
      return this.createPostResponse(null);
    } else {
      // I don't know what a failed response looks like off the top of my head
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body));
    }
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const tags = [...defaultTags, ...other];
    return tags.map((tag) => {
      return `#${tag.trim()}`
    }).join(',');
  }

}
