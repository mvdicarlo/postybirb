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
import { fileAsFormDataObject, MBtoBytes } from 'src/app/utils/helpers/file.helper';

function validate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const tags = getTags(submission, E621.name);
  if (tags.length < 4) problems.push(['Requires minimum tags', { website: 'e621', value: 4 }]);
  if (!supportsFileType(submission.fileInfo, ['jpeg', 'jpg', 'png', 'gif', 'webm'])) {
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

function descriptionParser(html: string): string {
  if (!html) return '';

  html = html.replace(/<b>/gi, '[b]');
  html = html.replace(/<i>/gi, '[i]');
  html = html.replace(/<u>/gi, '[u]');
  html = html.replace(/<s>/gi, '[s]');
  html = html.replace(/<\/b>/gi, '[/b]');
  html = html.replace(/<\/i>/gi, '[/i]');
  html = html.replace(/<\/u>/gi, '[/u]');
  html = html.replace(/<\/s>/gi, '[/s]');
  html = html.replace(/<em>/gi, '[i]');
  html = html.replace(/<\/em>/gi, '[/i]');
  html = html.replace(/<strong>/gi, '[b]');
  html = html.replace(/<\/strong>/gi, '[/b]');
  html = html.replace(/<span style="color: (.*?);">((.|\n)*?)<\/span>/gmi, '[color=$1]$2[/color]');

  html = html.replace(/<a(.*?)href="(.*?)"(.*?)>(.*?)<\/a>/gi, '"$4":$2');

  html = html.replace(/:e6(.*?):/gi, '@$1');

  return html;
}

function linkParser(html: string): string {
  return html.replace(/<a(.*?)href="(.*?)"(.*?)>(.*?)<\/a>/gi, '"$4":$2');
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
  preparsers: {
    description: [descriptionParser]
  },
  parsers: {
    description: [linkParser, PlaintextParser.parse],
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
    const response = await got.get(`${this.BASE_URL}/user/home`, this.BASE_URL, cookies, null);
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
    let cookies = await getCookies(postData.profileId, this.BASE_URL);
    const formPage = await got.get(`${this.BASE_URL}/post/upload`, this.BASE_URL, cookies, null);

    const data: any = {
      'post[tags]': this.formatTags(postData.tags, [this.getRatingTag(submission.rating)]).join(' ').trim(),
      'post[file]': fileAsFormDataObject(postData.primary),
      'post[rating]': this.getRating(submission.rating),
      'authenticity_token': HTMLParser.getInputValue(formPage.body, 'authenticity_token'),
      'post[description]': postData.description,
      'post[parent_id]': '',
      'post[upload_url]': ''
    };

    const options = postData.options;
    if (options.sourceURL) {
      data['post[source]'] = options.sourceURL;
    } else {
      data['post[source]'] = options.sourceURL[0] || '';
    }

    formPage.headers['set-cookie'].forEach(c => {
      const cParts = c.split(';')[0].split('=');
      const exist = cookies.find(e => e.name === cParts[0]);
      if (exist) {
        exist.value = cParts[1]
      }
    });

    cookies.push({
      name: 'mode',
      value: 'view'
    });

    const response = await got.gotPost(`${this.BASE_URL}/post/create`, data, this.BASE_URL, cookies, {
      headers: {
        'Referer': 'https://e621.net/post/upload',
        'Origin': 'https://e621.net',
        'Host': 'e621.net',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;',
      }
    });

    if (response.statusCode === 200 || response.statusCode === 302) { // got doesn't handle 302 well
      return this.createPostResponse(null);
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', response.body));
    }
  }
}
