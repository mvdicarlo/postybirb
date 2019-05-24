import $ from 'jquery';

import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { SofurrySubmissionForm } from './components/sofurry-submission-form/sofurry-submission-form.component';
import { GenericJournalSubmissionForm } from '../../components/generic-journal-submission-form/generic-journal-submission-form.component';
import { BaseWebsiteService } from '../base-website-service';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { getTags, supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { WebsiteStatus, LoginStatus, PostResult, SubmissionPostData } from '../../interfaces/website-service.interface';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import { Folder } from '../../interfaces/folder.interface';
import { SubmissionType, SubmissionRating } from 'src/app/database/tables/submission.table';
import { TypeOfSubmission, getTypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const tags = getTags(submission, SoFurry.name);
  if (tags.length < 2) problems.push(['Requires minimum tags', { website: 'SoFurry', value: 2 }]);
  if (!supportsFileType(submission.fileInfo, ['png', 'jpeg', 'jpg', 'gif', 'swf', 'txt'])) {
    problems.push(['Does not support file format', { website: 'SoFurry', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(50) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'SoFurry', value: '50MB' }]);
  }

  return problems;
}

function descriptionParse(html: string): string {
  return html
    .replace(/<p/gm, '<div')
    .replace(/<\/p>/gm, '</div>');
}

@Injectable({
  providedIn: 'root'
})
@Website({
  displayedName: 'SoFurry',
  login: {
    url: 'https://www.sofurry.com/user/login'
  },
  components: {
    submissionForm: SofurrySubmissionForm,
    journalForm: GenericJournalSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [descriptionParse],
    usernameShortcut: {
      code: 'sf',
      url: 'https://$1.sofurry.com/'
    }
  }
})
export class SoFurry extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://www.sofurry.com';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/upload/details?contentType=1`, this.BASE_URL, cookies, profileId);

    try {
      const body = response.body;
      if (body.includes('Logout')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = await this._getUsername(cookies, profileId);
        await this._getFolders(profileId, body /* we have the page we want so why not reuse it */);
      }
    } catch (e) { /* Nothing to do with this */ }

    return returnValue;
  }

  private async _getUsername(cookies: any[], profileId: string): Promise<string> {
    const res = await got.get(this.BASE_URL, this.BASE_URL, cookies, profileId);
    const body = res.body;
    let username = null;
    try {
      const aTags = HTMLParser.getTagsOf(body, 'a');
      for (let i = 0; i < aTags.length; i++) {
        const tag: string = aTags[i];
        const match = tag.match('avatar');
        if (match) {
          username = tag.match(/:\/\/.*?(\.)/g)[0].replace(/(:|\.|\/)/g, '');
          break;
        }
      }
    } catch (e) { }

    return username;
  }

  private async _getFolders(profileId: string, body: string): Promise<void> {
    const html$ = $.parseHTML(body);
    const select$ = $(html$).find('#UploadForm_folderId');
    const opts = $(select$).find('option');

    const folders: Folder[] = [];
    for (let i = 0; i < opts.length; i++) {
      const option = opts[i];
      folders.push({
        id: option.value,
        title: option.innerText
      });
    }

    this.userInformation.set(profileId, { folders });
  }

  public getFolders(profileId: string): Folder[] {
    return (this.userInformation.get(profileId) || <any>{}).folders || [];
  }

  private getContentRating(rating: SubmissionRating): any {
    if (rating === SubmissionRating.GENERAL) return 0;
    if (rating === SubmissionRating.MATURE || rating === SubmissionRating.ADULT) return 1;
    if (rating === SubmissionRating.EXTREME) return 2;
    return 0;
  }

  private getContentType(type: TypeOfSubmission): any {
    if (type === TypeOfSubmission.ART) return 1;
    if (type === TypeOfSubmission.AUDIO) return 2;
    if (type === TypeOfSubmission.ANIMATION) return 1;
    if (type === TypeOfSubmission.STORY) return 0;
    return 1;
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
    const response = await got.get(`${this.BASE_URL}/upload/details?contentType=3`, this.BASE_URL, cookies, postData.profileId);
    const body = response.body;

    const data: any = {
      YII_CSRF_TOKEN: HTMLParser.getInputValue(body, 'YII_CSRF_TOKEN'),
      'UploadForm[P_id]': HTMLParser.getInputValue(body, 'UploadForm[P_id]'),
      'UploadForm[P_title]': postData.title,
      'UploadForm[textcontent]': postData.description,
      'UploadForm[description]': postData.description.split('.')[0],
      'UploadForm[formtags]': this.formatTags(postData.tags, []),
      'UploadForm[contentLevel]': this.getContentRating(submission.rating),
      'UploadForm[P_hidePublic]': '0',
      'UploadForm[folderId]': '0',
      'UploadForm[newFolderName]': '',
      'UploadForm[P_isHTML]': '1',
      'save': 'Publish'
    };

    const postResponse = await got.post(`${this.BASE_URL}/upload/details?contentType=3`, data, this.BASE_URL, cookies, {
      headers: {
        referer: `${this.BASE_URL}/upload/details?contentType=3`
      }
    });
    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    return this.createPostResponse(null);
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const submissionType = getTypeOfSubmission(postData.primary.fileInfo);
    const type = this.getContentType(submissionType);
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/upload/details?contentType=${type}`, this.BASE_URL, cookies, postData.profileId);
    const body = response.body;

    const options = postData.options;

    const data: any = {
      YII_CSRF_TOKEN: HTMLParser.getInputValue(body, 'YII_CSRF_TOKEN'),
      'UploadForm[binarycontent_5]': fileAsFormDataObject(postData.thumbnail),
      'UploadForm[P_title]': postData.title,
      'UploadForm[description]': postData.description.replace(/<\/div>(\n|\r)/g, '</div>'),
      'UploadForm[formtags]': this.formatTags(postData.tags, []),
      'UploadForm[contentLevel]': this.getContentRating(submission.rating),
      'UploadForm[P_hidePublic]': options.viewOptions,
      'UploadForm[folderId]': options.folder
    };

    if (submissionType === TypeOfSubmission.STORY) {
      data['UploadForm[textcontent]'] = Buffer.from(postData.primary.buffer).toString('utf-8');
    } else {
      data['UploadForm[binarycontent]'] = fileAsFormDataObject(postData.primary);
    }

    const postResponse = await got.post(`${this.BASE_URL}/upload/details?contentType=${type}`, data, this.BASE_URL, cookies, {
      headers: {
        referer: `${this.BASE_URL}/upload/details?contentType=${type}`
      }
    });
    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    const postBody = postResponse.success.body;
    if (postBody.includes('sfContentTitle')) {
      const res = this.createPostResponse(null);
      res.srcURL = postResponse.success.response.request.uri.href;
      return res;
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', postBody));
    }
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    let tagBuilder = `${defaultTags.join(', ')}, ${other.join(', ')}`;
    return tagBuilder.trim();
  }

}
