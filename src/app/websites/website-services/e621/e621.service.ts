import { Injectable } from '@angular/core';
import { WebsiteService, WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { Website } from '../../decorators/website-decorator';
import { E621SubmissionForm } from './components/e621-submission-form/e621-submission-form.component';
import { getTags, supportsFileType } from '../../helpers/website-validator.helper';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { getTypeOfSubmission, TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { BaseWebsiteService } from '../base-website-service';
import { SubmissionRating } from 'src/app/database/tables/submission.table';
import { fileAsFormDataObject, MBtoBytes } from 'src/app/utils/helpers/file.helper';
import { E621LoginDialog } from './components/e621-login-dialog/e621-login-dialog.component';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { UsernameParser } from 'src/app/utils/helpers/description-parsers/username.parser';

interface e621LoginDetails {
  login: string;
  api_key: string;
}

const ACCEPTED_FILES = ['jpeg', 'jpg', 'png', 'gif', 'webm'];

function validate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const tags = getTags(submission, E621.name);
  if (tags.length < 4) problems.push(['Requires minimum tags', { website: 'e621', value: 4 }]);
  if (!supportsFileType(submission.fileInfo, ACCEPTED_FILES)) {
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
  html = UsernameParser.replaceText(html, 'e6', '@$1');
  html = html.replace(/<a(.*?)href="(.*?)"(.*?)>(.*?)<\/a>/gi, '"$4":$2');
  return html;
}

function postParser(html: string): string {
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
  html = html.replace(/<span style="color:\s*(.*?);*">((.|\n)*?)<\/span>/gmi, '[color=$1]$2[/color]');
  return html.replace(/<a(.*?)href="(.*?)"(.*?)>(.*?)<\/a>/gi, '"$4":$2');
}

@Injectable({
  providedIn: 'root'
})
@Website({
  acceptedFiles: ACCEPTED_FILES,
  acceptsSrcURL: true,
  displayedName: 'e621',
  login: {
    dialog: E621LoginDialog
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
    description: [postParser, PlaintextParser.parse],
    disableAdvertise: true,
    usernameShortcut: {
      code: 'e6',
      url: 'https://e621.net/user/show/$1'
    }
  }
})
export class E621 extends BaseWebsiteService implements WebsiteService {
  readonly BASE_URL: string = 'https://e621.net';

  constructor(private _profileManager: LoginProfileManagerService) {
    super();
  }

  public async checkStatus(profileId: string, data?: any): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    if (data && data.login && data.api_key) {
      returnValue.username = data.login;
      returnValue.status = LoginStatus.LOGGED_IN;
    }

    return returnValue;
  }

  public async authorize(data: { username: string, password: string }, profileId: string): Promise<boolean> {
    if (data.username && data.password) {
      this._profileManager.storeData(profileId, E621.name, {
        login: data.username,
        api_key: data.password
      });
      return true;
    }

    return false;
  }

  public unauthorize(profileId: string): void {
    this._profileManager.storeData(profileId, E621.name, null);
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
    const userInfo: e621LoginDetails = this._profileManager.getData(postData.profileId, E621.name);
    const data: any = {
      login: userInfo.login,
      api_key: userInfo.api_key,
      'upload[tag_string]': this.formatTags(postData.tags, [this.getRatingTag(postData.rating)]).join(' ').trim(),
      'upload[file]': fileAsFormDataObject(postData.primary),
      'upload[rating]': this.getRating(postData.rating),
      'upload[description]': postData.description,
      'upload[parent_id]': '',
    };

    const options = postData.options;
    const src = [
      options.sourceURL,
      options.sourceURL2,
      options.sourceURL3,
      options.sourceURL4,
      options.sourceURL5,
      ...postData.srcURLs
    ]
      .filter(s => !!s)
      .slice(0, 5)
      .join('%0A');

    data['upload[source]'] = src || '';
    if (options.parentId) {
      data['upload[parent_id]'] = options.parentId;
    }

    const response = await ehttp.post(`${this.BASE_URL}/uploads.json`, postData.profileId, data, {
      multipart: true,
      headers: {
        'User-Agent': `PostyBirb/${appVersion}`
      }
    });

    try {
      const postResponse: any = JSON.parse(response.body);
      if (postResponse.success || postResponse.location) {
        const res = this.createPostResponse(null);
        res.srcURL = `https://e621.net${postResponse.location}`;
        // NOTE: Pool feature removed until API is updated with better documentation
        // if (options.poolId) {
        //   const addPoolResponse = await ehttp.post(`${this.BASE_URL}/pools/${options.poolId}.json`, postData.profileId, {
        //     login: userInfo.login,
        //     api_key: userInfo.api_key,
        //     'pool_id': options.poolId,
        //     'post_id': `${postResponse.post_id}`,
        //   }, {
        //       multipart: true,
        //       headers: {
        //         'User-Agent': `PostyBirb/${appVersion}`
        //       }
        //     });
        // }
        return res;
      } else {
        return Promise.reject(this.createPostResponse(postResponse.reason || 'Unknown error', response.body));
      }
    } catch (e) {
      return Promise.reject(this.createPostResponse('Unknown error', response.body));
    }
  }
}
