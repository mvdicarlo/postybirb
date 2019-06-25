import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { WebsiteService, WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { WeasylSubmissionForm } from './components/weasyl-submission-form/weasyl-submission-form.component';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { getTags, supportsFileType } from '../../helpers/website-validator.helper';
import { Folder } from '../../interfaces/folder.interface';
import { BaseWebsiteService } from '../base-website-service';
import { GenericJournalSubmissionForm } from '../../components/generic-journal-submission-form/generic-journal-submission-form.component';
import { SubmissionType, SubmissionRating } from 'src/app/database/tables/submission.table';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import { TypeOfSubmission, getTypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { fileAsFormDataObject, MBtoBytes } from 'src/app/utils/helpers/file.helper';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const tags = getTags(submission, Weasyl.name);
  if (tags.length < 2) problems.push(['Requires minimum tags', { website: 'Weasyl', value: 2 }]);
  if (!supportsFileType(submission.fileInfo, ['jpg', 'jpeg', 'png', 'gif', 'md', 'txt', 'pdf', 'swf', 'mp3'])) {
    problems.push(['Does not support file format', { website: 'Weasyl', value: submission.fileInfo.type }]);
  }

  let maxMB = 10;
  const type: TypeOfSubmission = getTypeOfSubmission(submission.fileInfo);
  if (type === TypeOfSubmission.ANIMATION || type === TypeOfSubmission.AUDIO) {
    maxMB = 15;
  } else if (type === TypeOfSubmission.STORY) {
    if (submission.fileInfo.name.includes('.md') || submission.fileInfo.name.includes('.md')) {
      maxMB = 2;
    } else {
      maxMB = 10; // assume pdf
    }
  }

  if (MBtoBytes(maxMB) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: `Weasyl (${type})`, value: `${maxMB}MB` }]);
  }

  return problems;
}

function descriptionParse(html: string): string {
  return html
    .replace(/<p/gm, '<div')
    .replace(/<\/p>/gm, '</div>')
    .replace(/style="text-align:center"/g, 'class="align-center"')
    .replace(/style="text-align:right"/g, 'class="align-right"')
    .replace(/<\/div>\n<br>/g, '</div><br>');
}

function preparser(html: string): string {
  if (!html) return '';

  const regex = new RegExp(`:ws(.*?):`, 'gi');
  html = html.replace(regex, '<!~$1>');

  return html;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  login: {
    url: 'https://www.weasyl.com/signin'
  },
  components: {
    submissionForm: WeasylSubmissionForm,
    journalForm: GenericJournalSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  preparsers: {
    description: [preparser]
  },
  parsers: {
    description: [descriptionParse],
    usernameShortcut: {
      code: 'ws',
      url: 'https://weasyl.com/~$1'
    }
  }
})
export class Weasyl extends BaseWebsiteService implements WebsiteService {
  readonly BASE_URL: string = 'https://www.weasyl.com';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/api/whoami`, this.BASE_URL, cookies, profileId);
    try {
      const body = JSON.parse(response.body);
      if (body.login) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = body.login;
        await this._updateUserInformation(profileId, body.login);
      } else {
        this.userInformation.delete(profileId);
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  private async _updateUserInformation(profileId: string, loginName: string): Promise<void> {
    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/api/users/${loginName}/view`, this.BASE_URL, cookies, profileId);
    try {
      const info = JSON.parse(response.body);
      if (info) {
        this.userInformation.set(profileId, info);
      }
    } catch (e) { /* No important error handling */ }

    return;
  }

  public getFolders(profileId: string): Folder[] {
    const folders: Folder[] = [];
    if (this.userInformation.has(profileId)) {
      const data: any = this.userInformation.get(profileId) || {};
      if (data.folders) {
        for (let i = 0; i < data.folders.length; i++) {
          const folder = data.folders[i];
          const _folder: Folder = {
            title: folder.title,
            id: folder.folder_id
          };

          folders.push(_folder);

          if (folder.subfolders) {
            for (let j = 0; j < folder.subfolders.length; j++) {
              const subfolder = folder.subfolders[j];
              const _subfolder: Folder = {
                title: `${_folder.title} / ${subfolder.title}`,
                id: subfolder.folder_id,
              }

              folders.push(_subfolder);
            }
          }
        }
      }
    }

    return folders;
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    return super.formatTags(defaultTags, other).join(' ');
  }

  private getRating(rating: SubmissionRating): any {
    if (rating === SubmissionRating.GENERAL) return 10;
    else if (rating === SubmissionRating.MATURE) return 30;
    else if (rating === SubmissionRating.ADULT || rating === SubmissionRating.EXTREME) return 40;
    else return 10;
  }

  private getContentType(type: TypeOfSubmission): any {
    if (type === TypeOfSubmission.ART) return 'visual';
    if (type === TypeOfSubmission.STORY) return 'literary';
    if (type === TypeOfSubmission.ANIMATION || type === TypeOfSubmission.AUDIO) return 'multimedia'
    return 'visual';
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
    const response = await got.get(`${this.BASE_URL}/submit/journal`, this.BASE_URL, cookies, postData.profileId);
    const journalPage: string = response.body;

    const data = {
      token: HTMLParser.getInputValue(journalPage, 'token'),
      title: postData.title,
      rating: this.getRating(submission.rating),
      content: postData.description,
      tags: this.formatTags(postData.tags, [])
    }

    const postResponse = await got.post(`${this.BASE_URL}/submit/journal`, data, this.BASE_URL, cookies);
    if (postResponse.error) {
      return Promise.reject(this.createPostResponse(postResponse.error.message, postResponse.error.stack));
    } else {
      return this.createPostResponse(null);
    }
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const type = this.getContentType(postData.typeOfSubmission);
    const url = `${this.BASE_URL}/submit/${type}`;

    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const response = await got.get(url, this.BASE_URL, cookies, postData.profileId);
    const journalPage: string = response.body;

    const data: any = {
      token: HTMLParser.getInputValue(journalPage, 'token'),
      title: postData.title,
      rating: this.getRating(submission.rating),
      content: postData.description,
      tags: this.formatTags(postData.tags, []),
      submitfile: fileAsFormDataObject(postData.primary),
      redirect: url
    }

    if (postData.thumbnail) {
      data.thumbfile = fileAsFormDataObject(postData.thumbnail);
    }

    if (type === 'literary' || type === 'multimedia') {
      if (postData.thumbnail) {
        data.coverfile = fileAsFormDataObject(postData.thumbnail);
      } else {
        data.coverfile = '';
      }
    }

    // Options
    const options = postData.options;
    if (!options.notify) data.nonotification = 'on';
    if (options.friendsOnly) data.friends = 'on';
    if (options.critique) data.critique = 'on';
    data.folderid = options.folder || '';
    data.subtype = options.category || '';

    const postResponse = await got.post(url, data, this.BASE_URL, cookies);
    if (postResponse.error) {
      return Promise.reject(this.createPostResponse(postResponse.error.message, postResponse.error.stack));
    } else {
      const body = postResponse.success.body || '';
      if (body.includes('Submission Information')) {
        const res = this.createPostResponse(null);
        res.srcURL = postResponse.success.response.request.uri.href;
        return res;
      } else if (postResponse.success.body.includes('Choose Thumbnail')) {
        const thumbnailData: any = {
          token: HTMLParser.getInputValue(body, 'token'),
          submitid: HTMLParser.getInputValue(body, 'submitid'),
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 0,
          thumbfile: ''
        };

        const thumbnailResponse = await got.post(`${this.BASE_URL}/manage/thumbnail`, thumbnailData, this.BASE_URL, cookies);
        if (thumbnailResponse.error) {
          return Promise.reject(this.createPostResponse('Unknown error creating thumbnail', thumbnailResponse.error));
        } else {
          const res = this.createPostResponse(null);
          res.srcURL = postResponse.success.response.request.uri.href;
          return res;
        }
      } else if (body.includes('This page contains content that you cannot view according to your current allowed ratings')) {
        const res = this.createPostResponse(null);
        res.srcURL = postResponse.success.response.request.uri.href;
        return res;
      } else if (body.includes('Weasyl experienced a technical issue')) {
        const recheck = await got.get(postResponse.success.response.request.uri.href, this.BASE_URL, cookies, null);
        const body2 = recheck.success.body || '';
        if (body2.includes('Submission Information')) {
          const res = this.createPostResponse(null);
          res.srcURL = postResponse.success.response.request.uri.href;
          return res;
        } else {
          return Promise.reject(this.createPostResponse('Weasyl experienced a technical issue and cannot verify if posting completed', body2));
        }
      } else {
        return Promise.reject(this.createPostResponse('Unknown response from Weasyl', body));
      }
    }
  }
}
