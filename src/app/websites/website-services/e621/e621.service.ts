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
  username: string;
  hash: string;
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

    if (data && data.username) {
      returnValue.username = data.username;
      returnValue.status = LoginStatus.LOGGED_IN;
    }

    return returnValue;
  }

  public async authorize(data: { username: string, password: string }, profileId: string): Promise<boolean> {
    let success: boolean = false;
    const response = await ehttp.get(`${this.BASE_URL}/user/login.json?name=${encodeURIComponent(data.username)}&password=${encodeURIComponent(data.password)}`, profileId, {
      headers: {
        'User-Agent': `PostyBirb/${appVersion}`
      }
    });

    try {
      const info: any = JSON.parse(response.body);
      if (info.name) {
        success = true;
        this._profileManager.storeData(profileId, E621.name, {
          username: info.name,
          hash: info.password_hash
        });
      }
    } catch (err) { }
    return success;
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
      login: userInfo.username,
      password_hash: userInfo.hash,
      'post[tags]': this.formatTags(postData.tags, [this.getRatingTag(submission.rating)]).join(' ').trim(),
      'post[file]': fileAsFormDataObject(postData.primary),
      'post[rating]': this.getRating(submission.rating),
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

    const response = await ehttp.post(`${this.BASE_URL}/post/create.json`, postData.profileId, data, {
      multipart: true,
      headers: {
        'User-Agent': `PostyBirb/${appVersion}`
      }
    });

    try {
      const postResponse: any = JSON.parse(response.body);
      if (postResponse.success || postResponse.location) {
        const res = this.createPostResponse(null);
        res.srcURL = postResponse.location;
        return res;
      } else {
        return Promise.reject(this.createPostResponse(postResponse.reason || 'Unknown error', response.body));
      }
    } catch (e) {
      return Promise.reject(this.createPostResponse('Unknown error', response.body));
    }

  }
}
