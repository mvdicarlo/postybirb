import { Injectable } from '@angular/core';
import { BaseWebsiteService } from '../base-website-service';
import { GenericSubmissionForm } from '../../components/generic-submission-form/generic-submission-form.component';
import { Website } from '../../decorators/website-decorator';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { SubmissionRating } from 'src/app/database/tables/submission.table';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import { TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  if (submission.rating && submission.rating !== SubmissionRating.GENERAL) {
    problems.push(['Does not support rating', { website: 'Route 50', value: submission.rating }]);
  }

  if (!supportsFileType(submission.fileInfo, ['jpg', 'jpeg', 'png', 'gif', 'txt', 'mp3', 'midi', 'css', 'swf'])) {
    problems.push(['Does not support file format', { website: 'Route 50', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(10) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'Route 50', value: '10MB' }]);
  }

  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  displayedName: 'Route 50',
  login: {
    url: 'http://route50.net'
  },
  components: {
    submissionForm: GenericSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [PlaintextParser.parse]
  }
})
export class Route50 extends BaseWebsiteService {
  readonly BASE_URL: string = 'http://route50.net';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(this.BASE_URL, this.BASE_URL, cookies, profileId);
    try {
      const body: string = response.body;
      if (body.includes('loggedin')) {
        returnValue.status = LoginStatus.LOGGED_IN;

        const aTags = HTMLParser.getTagsOf(body, 'a');
        const matcher = /class="dispavatar.*"/g;
        if (aTags.length > 0) {
          for (let i = 0; i < aTags.length; i++) {
            let tag = aTags[i];
            if (tag.match(matcher)) {
              returnValue.username = tag.split('"')[3] || null;
              break;
            }
          }
        }

      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    return super.formatTags(defaultTags, other).join(' ');
  }

  private getCategoryCode(type: TypeOfSubmission): string {
    if (type === TypeOfSubmission.ART) {
      return '9';
    } else if (type === TypeOfSubmission.STORY) {
      return '14';
    } else if (type === TypeOfSubmission.AUDIO) {
      return '15';
    } else if (type === TypeOfSubmission.ANIMATION) {
      return '12';
    }
    return '9';
  }

  private getContentType(type: TypeOfSubmission): string {
    if (type === TypeOfSubmission.ART) {
      return 'image';
    } else if (type === TypeOfSubmission.STORY) {
      return 'text';
    } else if (type === TypeOfSubmission.AUDIO) {
      return 'audio';
    } else if (type === TypeOfSubmission.ANIMATION) {
      return 'flash';
    }
    return 'image';
  }

  public async post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);

    const data: any = {
      title: postData.title,
      file: fileAsFormDataObject(postData.primary),
      thumbnail: fileAsFormDataObject(postData.thumbnail),
      category: this.getCategoryCode(postData.typeOfSubmission),
      type: this.getContentType(postData.typeOfSubmission),
      tags: this.formatTags(postData.tags, []),
      description: postData.description,
      swf_width: '',
      swf_height: '',
      minidesc: '',
      enableComments: '1',
      tos: '1',
      coc: '1'
    }

    const response = await got.post(`${this.BASE_URL}/galleries/submit`, data, this.BASE_URL, cookies)
    if (response.error) {
      return Promise.reject(this.createPostResponse('Unknown error posting to Route 50', response.error));
    } else {
      if (response.success.body.includes(postData.title)) {
        return this.createPostResponse(null);
      } else {
        return Promise.reject(this.createPostResponse(null, response.error));
      }
    }
  }
}
