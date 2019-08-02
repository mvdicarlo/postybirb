import $ from 'jquery';

import { Injectable } from '@angular/core';
import { BaseWebsiteService } from '../base-website-service';
import { Website } from '../../decorators/website-decorator';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { SubmissionRating, SubmissionType } from 'src/app/database/tables/submission.table';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { LoginStatus, WebsiteStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { KoFiSubmissionForm } from './components/ko-fi-submission-form/ko-fi-submission-form.component';
import { fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];

  if (submission.rating && submission.rating !== SubmissionRating.GENERAL) {
    problems.push(['Does not support rating', { website: 'Ko-fi', value: submission.rating }]);
  }

  if (!supportsFileType(submission.fileInfo, ['jpeg', 'jpg', 'png'])) {
    problems.push(['Does not support file format', { website: 'Ko-fi', value: submission.fileInfo.type }]);
  }

  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  displayedName: 'Ko-fi',
  login: {
    url: 'https://ko-fi.com/account/login'
  },
  components: {
    submissionForm: KoFiSubmissionForm,
    journalForm: KoFiSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [],
  }
})
export class KoFi extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://ko-fi.com';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/manage/mypage`, this.BASE_URL, cookies, profileId);
    try {
      if (!response.body.includes('Start a Page')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        const html$ = $.parseHTML(response.body);

        returnValue.username = $(html$).find('name').text();
        this.userInformation.set(profileId, {
          gold: !response.body.includes('Upgrade to Gold'),
          id: response.body.match(/pageId:\s'.*?'/g)[0].split("'")[1]
        });

        this._hardenCookies(profileId, cookies);
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  private _hardenCookies(profileId: string, cookies: any[]): void {
    const api = getCookieAPI(profileId);
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        if (cookie.session) {
          const c = got.convertCookie(cookie);
          const now = new Date();
          c.expirationDate = now.setMonth(now.getMonth() + 4);
          api.set(c, function(err) {
            if (err) {
              console.warn('Failed to persist ko-fi', err, this);
            }
          }.bind(c));
        }
    }
  }

  public isGold(profileId: string): boolean {
    const info = this.userInformation.get(profileId) || {};
    return !!info.gold;
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

    const data = {
      blogPostId: '',
      blogPostTitle: postData.title,
      blogPostBody: postData.description,
      featuredImage: '',
      embedUrl: '',
      tags: this.formatTags(postData.tags, []).join(','),
      postAudience: postData.options.audience
    };

    const postResponse = await got.post(`${this.BASE_URL}/Blog/AddBlogPost`, data, this.BASE_URL, cookies, {
      gzip: true,
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Referer': 'https://ko-fi.com/',
        'Connection': 'keep-alive'
      }
    });
    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    const postUrl = postResponse.success.body.match(/\/Blog\/PublishPost\/\d+/)[0];
    if (!postUrl) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body));
    }

    const publish = await got.post(`${this.BASE_URL}${postUrl}`, null, this.BASE_URL, cookies, {
      gzip: true,
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': '*/*',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Referer': 'https://ko-fi.com/',
        'Connection': 'keep-alive'
      }
    });
    if (publish.error) {
      return Promise.reject(this.createPostResponse('Unknown error', publish.error));
    }

    if (publish.success.response.statusCode === 200) {
      return this.createPostResponse(null);
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', publish.success.body));
    }
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);

    const uploadData: any = {
      uniqueFilename: '',
      file: fileAsFormDataObject(postData.primary)
    };

    const upload = await got.post(`${this.BASE_URL}/Buttons/SaveUploadedFile`, uploadData, this.BASE_URL, cookies, {
      gzip: true,
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'application/json',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Referer': 'https://ko-fi.com/',
        'Connection': 'keep-alive'
      }
    });

    if (upload.error) {
      return Promise.reject(this.createPostResponse('Unknown error', upload.error));
    }

    const body = JSON.parse(upload.success.body);
    const filename = body.FileName;

    const info = this.userInformation.get(postData.profileId);

    const data: any = {
      uniqueName: filename,
      title: postData.title,
      description: PlaintextParser.parse(postData.description),
      postToTwitter: 'false',
      enableHiRes: 'false',
      buttonId: info.id,
    };

    const postResponse = await got.requestGet(`${this.BASE_URL}/Buttons/AddImageFeedItem`, this.BASE_URL, cookies, {
      form: data,
      gzip: true,
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html, */*',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Referer': 'https://ko-fi.com/',
        'Connection': 'keep-alive'
      }
    });

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    if (postResponse.success.response.statusCode === 200) {
      return this.createPostResponse(null);
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body));
    }
  }
}
