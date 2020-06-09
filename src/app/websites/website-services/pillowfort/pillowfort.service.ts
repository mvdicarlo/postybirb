import { Injectable } from '@angular/core';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { SubmissionType, SubmissionRating } from 'src/app/database/tables/submission.table';
import { getTypeOfSubmission, TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { decodeText, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import { GenericJournalSubmissionForm } from '../../components/generic-journal-submission-form/generic-journal-submission-form.component';
import { Website } from '../../decorators/website-decorator';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { Folder } from '../../interfaces/folder.interface';
import { LoginStatus, PostResult, SubmissionPostData, WebsiteStatus } from '../../interfaces/website-service.interface';
import { BaseWebsiteService } from '../base-website-service';
import { SofurrySubmissionForm } from '../sofurry/components/sofurry-submission-form/sofurry-submission-form.component';
import { PillowfortSubmissionForm } from './components/pillowfort-submission-form/pillowfort-submission-form.component';

const ACCEPTED_FILES = ['png', 'jpeg', 'jpg', 'gif'];

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  if (!supportsFileType(submission.fileInfo, ACCEPTED_FILES)) {
    problems.push(['Does not support file format', { website: 'Pillowfort', value: submission.fileInfo.type }]);
  }
  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  acceptedFiles: ACCEPTED_FILES,
  additionalFiles: false, // NOTE: false due to issues
  displayedName: 'Pillowfort',
  login: {
    url: 'https://www.pillowfort.social/users/sign_in'
  },
  components: {
    submissionForm: PillowfortSubmissionForm,
    journalForm: PillowfortSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [],
    usernameShortcut: {
      code: 'pf',
      url: 'https://www.pillowfort.social/$1'
    }
  }
})
export class Pillowfort extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://www.pillowfort.social';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(this.BASE_URL, this.BASE_URL, cookies, null);

    try {
      const body = response.body;
      if (body.includes('/signout')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = body.match(/value="current_user">(.*?)</)[1];
      }
    } catch (e) { /* Nothing to do with this */ }

    return returnValue;
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
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/posts/new`, this.BASE_URL, cookies, null);
    const body = response.body;

    const data: any = {
      authenticity_token: HTMLParser.getInputValue(body, 'authenticity_token'),
      utf8: '✓',
      post_to: 'current_user',
      post_type: 'text',
      title: postData.title,
      content: `<p>${postData.description}</p>`,
      privacy: postData.options.viewable,
      tags: this.formatTags(postData.tags),
      commit: 'Submit'
    };

    if (postData.options.allowReblog) {
      data.rebloggable = 'on';
    }
    if (!postData.options.disableComments) {
      data.commentable = 'on';
    }
    if (postData.options.nsfw || postData.rating !== SubmissionRating.GENERAL) {
      data.nsfw = 'on';
    }

    const postReponse = await got.post(`${this.BASE_URL}/posts/create`, data, this.BASE_URL, cookies);
    if (postReponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postReponse.error));
    }

    if (postReponse.success.response.statusCode !== 200) {
      return Promise.reject(this.createPostResponse('Unknown error', postReponse.success.body));
    }
    return this.createPostResponse(null);
  }

  private async uploadImage(image: any, cookies: any[], auth: string): Promise<{ full_image: string, small_image: string, photo: any }> {
    const photo = fileAsFormDataObject(image);
    const upload = await got.post(`${this.BASE_URL}/image_upload`, {
        file_name: image.fileInfo.name,
        photo
      }, this.BASE_URL, cookies, {
        headers: {
          'X-CSRF-Token': auth
        }
    });

    if (upload.error) {
      return Promise.reject(this.createPostResponse('Failed to upload image', upload.error));
    }

    return { ...JSON.parse(upload.success.body), photo };
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/posts/new`, this.BASE_URL, cookies, null);
    const body = response.body;
    const data: any = {
      authenticity_token: HTMLParser.getInputValue(body, 'authenticity_token'),
      utf8: '✓',
      post_to: 'current_user',
      post_type: 'picture',
      title: postData.title,
      content: `<p>${postData.description}</p>`,
      privacy: postData.options.viewable,
      tags: this.formatTags(postData.tags),
      commit: 'Submit',
      'picture[][file]': [],
      'picture[][pic_url]': [],
      'picture[][small_image_url]': [],
      'picture[][b2_lg_url]': [],
      'picture[][b2_sm_url]': [],
      'picture[][row]': [],
      'picture[][col]': [],
    };

    if (postData.options.allowReblog) {
      data.rebloggable = 'on';
    }
    if (!postData.options.disableComments) {
      data.commentable = 'on';
    }
    if (postData.options.nsfw || postData.rating !== SubmissionRating.GENERAL) {
      data.nsfw = 'on';
    }

    const uploads = await Promise.all([postData.primary, /*...(postData.additionalFiles || [])*/].map(file => this.uploadImage(file, cookies, data.authenticity_token)));
    uploads.forEach((d, i) => {
      data['picture[][file]'].push('');
      data['picture[][pic_url]'].push(d.full_image);
      data['picture[][small_image_url]'].push(d.small_image);
      data['picture[][b2_lg_url]'].push('');
      data['picture[][b2_sm_url]'].push('');
      data['picture[][row]'].push(i + 1);
      data['picture[][col]'].push(0);
    });

    const postReponse = await got.post(`${this.BASE_URL}/posts/create`, data, this.BASE_URL, cookies);

    if (postReponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postReponse.error));
    }

    if (postReponse.success.response.statusCode !== 200) {
      return Promise.reject(this.createPostResponse('Unknown error', postReponse.success.body));
    }
    return this.createPostResponse(null);
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    let tagBuilder = `${defaultTags.join(', ')}, ${other.join(', ')}`;
    return [...defaultTags, ...other].join(', ');
  }
}
