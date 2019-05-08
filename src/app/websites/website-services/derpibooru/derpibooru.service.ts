import $ from 'jquery';

import { Injectable } from '@angular/core';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { getTags, supportsFileType } from '../../helpers/website-validator.helper';
import { getTypeOfSubmission, TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { MBtoBytes, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { Website } from '../../decorators/website-decorator';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { DerpibooruSubmissionForm } from './components/derpibooru-submission-form/derpibooru-submission-form.component';
import { BaseWebsiteService } from '../base-website-service';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import { SubmissionRating } from 'src/app/database/tables/submission.table';

function validate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const tags = getTags(submission, Derpibooru.name);
  if (tags.length < 3) problems.push(['Requires minimum tags', { website: 'Derpibooru', value: 3 }]);
  if (!supportsFileType(submission.fileInfo, ['jpeg', 'jpg', 'png', 'svg', 'gif'])) {
    problems.push(['Does not support file format', { website: 'e621', value: submission.fileInfo.type }]);
  }

  const type = getTypeOfSubmission(submission.fileInfo)
  if (type === TypeOfSubmission.STORY || !type) {
    problems.push(['Does not support file format', { website: 'Derpibooru', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(50) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'Derpibooru', value: '50MB' }]);
  }

  return problems;
}

function descriptionParser(html: string): string {
    if (!html) return '';

    html = html.replace(/<b>/gi, '*');
    html = html.replace(/<i>/gi, '_');
    html = html.replace(/<u>/gi, '+');
    html = html.replace(/<s>/gi, '-');
    html = html.replace(/<\/b>/gi, '*');
    html = html.replace(/<\/i>/gi, '_');
    html = html.replace(/<\/u>/gi, '+');
    html = html.replace(/<\/s>/gi, '-');
    html = html.replace(/<em>/gi, '_');
    html = html.replace(/<\/em>/gi, '_');
    html = html.replace(/<strong>/gi, '*');
    html = html.replace(/<\/strong>/gi, '*');
    html = html.replace(/<a(.*?)href="(.*?)"(.*?)>(.*?)<\/a>/gi, '"$4":$2');

    return html;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  acceptsSrcURL: true,
  displayedName: 'Derpibooru',
  login: {
    url: 'https://derpibooru.org/users/sign_in'
  },
  components: {
    submissionForm: DerpibooruSubmissionForm
  },
  validators: {
    submission: validate
  },
  preparsers: {
    description: [descriptionParser]
  },
  parsers: {
    description: [PlaintextParser.parse],
    disableAdvertise: true,
    usernameShortcut: {
      code: 'db',
      url: 'https://derpibooru.org/profiles/$1'
    }
  }
})
export class Derpibooru extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://derpibooru.org';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/users/edit`, this.BASE_URL, cookies, null);
    try {
      const body = response.body;
      if (body.includes('Logout')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = body.match(/\/profiles\/.*?(?=")/g)[0].split('/')[2];
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  private getRatingTag(rating: SubmissionRating): any {
    if (rating === SubmissionRating.GENERAL) return 'safe';
    if (rating === SubmissionRating.MATURE) return 'questionable';
    if (rating === SubmissionRating.ADULT || rating === SubmissionRating.EXTREME) return 'explicit';
    return 'safe';
  }

  public getFormData(profileId: string): Promise<any> {
    return new Promise((resolve) => {
      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          partition: `persist:${profileId}`
        }
      });
      win.loadURL(`${this.BASE_URL}/images/new`);
      win.once('ready-to-show', () => {
        if (win.isDestroyed()) {
          resolve({});
          return;
        }

        win.webContents.executeJavaScript(`Array.from(new FormData(document.getElementById('new_image'))).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})`).then(function(value) {
          resolve(value);
        })
        .catch(() => {
          resolve({});
        })
        .finally(() => {
          win.destroy();
        });
      });
    });
  }

  public async post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const tags: string[] = this.formatTags(postData.tags, [], ' ');
    const ratingTag: string = this.getRatingTag(submission.rating);
    if (!tags.includes(ratingTag)) tags.push(ratingTag);

    const options = postData.options;

    const data = await this.getFormData(postData.profileId);
    const cookies = await getCookies(postData.profileId, this.BASE_URL);

    Object.assign(data, {
      _method: 'post',
      'image[tag_input]': tags.join(', ').trim(),
      'image[image]': fileAsFormDataObject(postData.primary),
      'image[description]': postData.description,
      'image[source_url]': options.sourceURL || (postData.srcURLs[0] || ''),
      'image[anonymous]': '0',
      'commit': 'Create Image'
    });

    const postRequest = await got.post(`${this.BASE_URL}/images`, data, this.BASE_URL, cookies);

    if (postRequest.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postRequest.error));
    }

    if (postRequest.success.body.includes('Uploaded')) {
      return this.createPostResponse(null);
    } else {
      const problem = $.parseHTML(postRequest.success.body);

      return Promise.reject(this.createPostResponse($(problem).find('#error_explanation').text().split(':')[1], postRequest.success.body));
    }
  }
}
