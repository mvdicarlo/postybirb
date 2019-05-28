import $ from 'jquery';

import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import * as dotProp from 'dot-prop';
import { BaseWebsiteService } from '../base-website-service';
import { WebsiteStatus, LoginStatus, PostResult, SubmissionPostData } from '../../interfaces/website-service.interface';
import { Folder } from '../../interfaces/folder.interface';
import { AryionSubmissionForm } from './components/aryion-submission-form/aryion-submission-form.component';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];

  const options = dotProp.get(formData, `${Aryion.name}.options`, {});
  if (!(options.reqtag === 0 || options.reqtag === 1) || !options.folderId) {
    problems.push(['Options are incomplete', { website: 'Aryion' }]);
  }

  if (!supportsFileType(submission.fileInfo, ['jpg', 'jpeg', 'gif', 'png', 'doc', 'docx', 'xls', 'xlsx', 'swf', 'vsd', 'txt', 'rtf', 'avi', 'mpg', 'mpeg', 'flv', 'mp4'], )) {
    problems.push(['Does not support file format', { website: 'Aryion', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(20) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: `Aryion`, value: `20MB` }]);
  }

  return problems;
}

function preparser(html: string): string {
  if (!html) return '';

  const regex = new RegExp(`:ar(.*?):`, 'gi');
  html = html.replace(regex, `:icon$1:`);

  return html;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  login: {
    url: 'https://aryion.com/forum/ucp.php?mode=login'
  },
  components: {
    submissionForm: AryionSubmissionForm,
  },
  validators: {
    submission: submissionValidate
  },
  preparsers: {
    description: [preparser]
  },
  parsers: {
    description: [PlaintextParser.parse],
    usernameShortcut: {
      code: 'ar',
      url: 'https://aryion.com/g4/user/$1'
    }
  }
})
export class Aryion extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://aryion.com';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/g4/`, this.BASE_URL, cookies, profileId);
    try {
      const body = response.body;
      if (!body.includes('Login')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        const html$ = $.parseHTML(body);
        returnValue.username = $(html$).find('.user-link').text();

        await this._getFolders(profileId, cookies);

        const canUploadCheck = await got.get(`${this.BASE_URL}/g4/gallery/${returnValue.username}`, this.BASE_URL, cookies, profileId);
        const uploadBody = canUploadCheck.body;
        if (!uploadBody.includes('New Item')) {
          returnValue.username = 'No Upload Privileges';
        }
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  private async _getFolders(profileId: string, cookies: any[]): Promise<void> {
    const folderPage = await got.get(`${this.BASE_URL}/g4/treeview.php`, this.BASE_URL, cookies, profileId);
    const folders: Folder[] = [];

    const html$ = $.parseHTML(folderPage.body);

    $(html$).find('.folder').each((index, el) => {
      folders.push({
        id: $(el).attr('data-tid'),
        title: $(el).text()
      });
    });

    this.userInformation.set(profileId, { folders });
  }

  public getFolders(profileId: string): Folder[] {
    const options: any = this.userInformation.get(profileId) || {};
    return dotProp.get(options, 'folders', []);
  }

  public async post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);

    const data: any = {
      action: 'new-item',
      parentid: postData.options.folderId,
      MAX_FILE_SIZE: '78643200',
      title: postData.title,
      file: fileAsFormDataObject(postData.primary),
      thumb: fileAsFormDataObject(postData.thumbnail),
      desc: postData.description,
      tags: this.formatTags(postData.tags, []).filter(f => !f.match(/^vore$/i)).filter(f => !f.match(/^non-vore$/i)).join('\n'),
      'reqtag[]': postData.options.reqtag === 1 ? 'Non-Vore' : '',
      view_perm: postData.options.viewPerm,
      comment_perm: postData.options.commentPerm,
      tag_perm: postData.options.tagPerm,
      scrap: postData.options.scraps ? 'on' : ''
    };

    const postRequest = await got.post(`${this.BASE_URL}/g4/itemaction.php`, data, this.BASE_URL, cookies);
    if (postRequest.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postRequest.error));
    }

    if (postRequest.success.response.statusCode === 200) {
      try {
        const json: any = JSON.parse(postRequest.success.body.replace(/<(?:[^>'"]*|(['"]).*?\1)*>/gmi, ''));
        if (json.id) {
          return this.createPostResponse(null);
        } else {
          return Promise.reject(this.createPostResponse('Unknown error', postRequest.success.body));
        }
      } catch (e) {
        return Promise.reject(this.createPostResponse('Unknown error', postRequest.success.body));
      }
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', postRequest.success.body));
    }
}

formatTags(defaultTags: string[] = [], other: string[] = []): any {
  const tags = [...defaultTags, ...other];
  return tags.map((tag) => {
    return tag.trim();
  });
}
}
