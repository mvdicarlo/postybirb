import { Injectable } from '@angular/core';
import { WebsiteService, WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import { Website } from '../../decorators/website-decorator';
import { E621SubmissionForm } from './components/e621-submission-form/e621-submission-form.component';
import { getTags, supportsFileType } from '../../helpers/website-validator.helper';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { getTypeOfSubmission, TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { BaseWebsiteService } from '../base-website-service';
import { SubmissionRating } from 'src/app/database/tables/submission.table';
import { asFormDataObject, MBtoBytes } from 'src/app/utils/helpers/file.helper';

function validate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const tags = getTags(submission, E621.name);
  if (tags.length < 4) problems.push(['Requires minimum tags', { website: 'e621', value: 4 }]);
  if (!supportsFileType(submission.fileInfo.type, ['jpeg', 'jpg', 'png', 'gif', 'webm'])) {
    problems.push(['Does not support file format', { website: 'e621', value: submission.fileInfo.type }]);
  }

  const type = getTypeOfSubmission(submission.fileInfo)
  if (type === TypeOfSubmission.STORY || !type) {
    problems.push(['Does not support file format', { website: 'e621', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(100) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'e621', value: '100MB' }]);
  }

  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  acceptsSrcURL: true,
  displayedName: 'e621',
  login: {
    url: 'https://e621.net/user/login'
  },
  components: {
    submissionForm: E621SubmissionForm
  },
  validators: {
    submission: validate
  },
  parsers: {
    description: [PlaintextParser.parse],
    disableAdvertise: true,
    usernameShortcut: {
      code: 'e6',
      url: 'https://e621.net/user/show/$1'
    }
  }
})
export class E621 extends BaseWebsiteService implements WebsiteService {
  readonly BASE_URL: string = 'https://e621.net';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/user/home`, this.BASE_URL, cookies);
    try { // Old legacy code that is marked for refactor
      const body = response.body;
      const matcher = /Logged in as.*"/g;
      const aTags = HTMLParser.getTagsOf(body, 'a');
      if (aTags.length > 0) {
        for (let i = 0; i < aTags.length; i++) {
          let tag = aTags[i];
          if (tag.match(matcher)) {
            returnValue.username = tag.match(/Logged in as.*"/g)[0].split(' ')[3].replace('"', '') || null;
            returnValue.status = LoginStatus.LOGGED_IN;
            break;
          }
        }
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  getRatingTag(rating: SubmissionRating): any {
    if (rating === SubmissionRating.GENERAL) return 'rating:s';
    else if (rating === SubmissionRating.MATURE) return 'rating:q';
    else if (rating === SubmissionRating.ADULT || rating === SubmissionRating.EXTREME) return 'rating:e';
    else return 'rating:s';
  }

  getRating(rating: SubmissionRating): string {
    if (rating === SubmissionRating.GENERAL) return 'safe';
    else if (rating === SubmissionRating.MATURE) return 'questionable';
    else if (rating === SubmissionRating.ADULT || rating === SubmissionRating.EXTREME) return 'explicit';
    else return 'safe';
  }

  public async post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const formPage = await got.get(`${this.BASE_URL}/post/upload`, this.BASE_URL, cookies);

    const data: any = {
      'post[tags]': this.formatTags(postData.tags, [this.getRatingTag(submission.rating)]),
      'post[file]': asFormDataObject(postData.primary.buffer, postData.primary.fileInfo),
      'post[rating]': this.getRating(submission.rating),
      'authenticity_token': HTMLParser.getInputValue(formPage.body, 'authenticity_token'),
      'post[description]': postData.description,
      'post[parent_id]': ''
    };

    const options = postData.options;
    if (options.sourceURL) {
      data['post[source]'] = options.sourceURL;
    } else {
      data['post[source]'] = options.sourceURL[0] || '';
    }

    const response = await got.requestPost(`${this.BASE_URL}/post/create`, data, this.BASE_URL, cookies);
    if (response.error) {
      return Promise.reject(this.createPostResponse(null, response.error));
    } else {
      return this.createPostResponse(null);
    }
  }
}
