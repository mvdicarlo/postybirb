import $ from 'jquery';

import { Injectable } from '@angular/core';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { Website } from '../../decorators/website-decorator';
import { supportsFileType, getTags } from '../../helpers/website-validator.helper';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { MBtoBytes, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { BaseWebsiteService } from '../base-website-service';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { PixivSubmissionForm } from './components/pixiv-submission-form/pixiv-submission-form.component';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import { SubmissionRating } from 'src/app/database/tables/submission.table';

const ACCEPTED_FILES = ['png', 'jpeg', 'jpg', 'gif'];

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const supportedFiles: string[] = ACCEPTED_FILES;

  const tags = getTags(submission, Pixiv.name);
  if (tags.length < 1) problems.push(['Requires minimum tags', { website: 'Pixiv', value: 1 }]);

  if (!supportsFileType(submission.fileInfo, supportedFiles)) {
    problems.push(['Does not support file format', { website: 'Pixiv', value: submission.fileInfo.type }]);
  }

  if (submission.additionalFileInfo && submission.additionalFileInfo.length) {
    submission.additionalFileInfo
      .filter(info => !supportsFileType(info, supportedFiles))
      .forEach(info => problems.push(['Does not support file format', { website: 'Pixiv', value: info.type }]));
  }

  if (MBtoBytes(32) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'Pixiv', value: '32MB' }]);
  }

  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  acceptedFiles: ACCEPTED_FILES,
  additionalFiles: true,
  postWaitInterval: 60000 * 6, // 6 minutes
  login: {
    url: 'https://accounts.pixiv.net/login?lang=en'
  },
  components: {
    submissionForm: PixivSubmissionForm,
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [PlaintextParser.parse]
  }
})
export class Pixiv extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://www.pixiv.net';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}`, this.BASE_URL, cookies, profileId);
    try {
      const body = response.body;
      const match = response.body.includes('signup-form');
      if (!match) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = 'Logged In';
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  private getContentRating(rating: SubmissionRating): any {
    if (rating === SubmissionRating.GENERAL) return 0;
    if (rating === SubmissionRating.MATURE || rating === SubmissionRating.ADULT) return 1;
    if (rating === SubmissionRating.EXTREME) return 2;
    return 0;
  }

  public async post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const formPage = await got.get(`${this.BASE_URL}/upload.php`, this.BASE_URL, cookies, postData.profileId);
    const body = formPage.body;
    const filesToPost = [postData.thumbnail, postData.primary, ...postData.additionalFiles].filter(f => f !== null && f !== undefined);

    const data: any = {
      tt: HTMLParser.getInputValue(body, 'tt', 2),
      uptype: 'illust',
      'x_restrict_sexual': this.getContentRating(postData.rating),
      sexual: '',
      title: postData.title.substring(0, 32),
      tag: this.formatTags(postData.tags, []),
      comment: postData.description,
      rating: '1',
      mode: 'upload',
      suggested_tags: '',
      book_style: '0',
      restrict: '0',
      'quality[]': '',
      quality_text: '',
      qropen: '',
      ai_type: postData.options.aiGenerated ? '2' : '1',
      'files[]': filesToPost.map(f => fileAsFormDataObject(f)),
      'file_info[]': filesToPost.map(f => JSON.stringify(f.fileInfo)),
    };

    const options = postData.options;
    if (!options.communityTags) data.taglock = '1';
    if (options.original) data.original = 'on';

    const sexualType = options.restrictSexual;
    if (options.sexual && sexualType === '0') {
      data.sexual = 'implicit';
    } else if (sexualType !== '0') {
      data.x_restrict_sexual = sexualType;
      if (options.sexualTypes) {
        for (let i = 0; i < options.sexualTypes.length; i++) {
          data[options.sexualTypes[i]] = 'on';
        }
      }
    }

    if (options.content) {
      options.content.forEach(c => {
        data[c] = 'on';
      });
    }

    const postResponse = await got.post(`${this.BASE_URL}/upload.php`, data, this.BASE_URL, cookies, {
      qsStringifyOptions: { arrayFormat: 'repeat' },
      gzip: true,
      headers: {
        pragma: 'no-cache',
        'cache-control': 'no-cache',
        'sec-ch-ua': '"Chromium";v="86", "\"Not\\A;Brand";v="99", "Google Chrome";v="86"',
        accept: 'application/json, text/javascript, */*; q=0.01',
        'x-requested-with': 'XMLHttpRequest',
        'sec-ch-ua-mobile': '?0',
        origin: 'https://www.pixiv.net',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        referer: 'https://www.pixiv.net/upload.php',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-US,en;q=0.9'
      }
    });

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    let postBody = postResponse.success.body;
    if (typeof postBody === 'string') postBody = JSON.parse(postBody);
    if (!postBody.error) {
      return this.createPostResponse(null);
    } else {
      return Promise.reject(this.createPostResponse(JSON.stringify(postBody.error), postBody));
    }
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    return super.formatTags(defaultTags, other).slice(0, 10).join(' ');
  }

}
