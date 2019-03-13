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
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import { fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];

  if (submission.rating !== SubmissionRating.GENERAL) {
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
    const response = await got.get(`${this.BASE_URL}/Manage/`, this.BASE_URL, cookies, profileId);
    try {
      if (!response.body.includes('Log in')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        const html$ = $.parseHTML(response.body);

        returnValue.username = $(html$).find('#dash-profile-link').attr('title');
        this.userInformation.set(profileId, {
          gold: response.body.includes('Upgrade to Gold'),
          id: $(html$).find('#dash-profile-link').attr('href').replace('/', '')
        });
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
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
      blogPostTitle: submission.title,
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

    const postId = HTMLParser.getInputValue(postResponse.success.body, 'blogPostId');
    if (!postId) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body));
    }

    const publish = await got.post(`${this.BASE_URL}/Blog/PublishPost/${postId}`, null, this.BASE_URL, cookies, {
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
      file: fileAsFormDataObject(postData.primary.buffer, postData.primary.fileInfo)
    }

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
      title: submission.title,
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
