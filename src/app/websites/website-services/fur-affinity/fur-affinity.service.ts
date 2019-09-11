import $ from 'jquery';

import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { WebsiteService, WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import { BaseWebsiteService, UserInformation } from '../base-website-service';
import { Folder } from '../../interfaces/folder.interface';
import { FurAffinitySubmissionForm } from './components/fur-affinity-submission-form/fur-affinity-submission-form.component';
import { BBCodeParser } from 'src/app/utils/helpers/description-parsers/bbcode.parser';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { MBtoBytes, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { SubmissionType, SubmissionRating } from 'src/app/database/tables/submission.table';
import { TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { FurAffinityJournalForm } from './components/fur-affinity-journal-form/fur-affinity-journal-form.component';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  if (!supportsFileType(submission.fileInfo, ['jpg', 'gif', 'png', 'jpeg', 'jpg', 'swf', 'doc', 'docx', 'rtf', 'txt', 'pdf', 'odt', 'mid', 'wav', 'mp3', 'mpeg', 'mpg'])) {
    problems.push(['Does not support file format', { website: 'Fur Affinity', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(10) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: `Fur Affinity`, value: '10MB' }]);
  }

  return problems;
}

function preparser(html: string): string {
  if (!html) return '';

  const regex = new RegExp(`:fa(.*?):`, 'gi');
  html = html.replace(regex, `:icon$1:`);

  return html;
}

function descriptionParser(bbcode: string): string {
  if (!bbcode) return '';
  return bbcode.replace(/\[hr\]/g, '-----');
}

@Injectable({
  providedIn: 'root'
})
@Website({
  postWaitInterval: 30000,
  displayedName: 'Fur Affinity',
  login: {
    url: 'https://www.furaffinity.net/login'
  },
  components: {
    submissionForm: FurAffinitySubmissionForm,
    journalForm: FurAffinityJournalForm
  },
  validators: {
    submission: submissionValidate
  },
  preparsers: {
    description: [preparser]
  },
  parsers: {
    description: [BBCodeParser.parse, descriptionParser],
    usernameShortcut: {
      code: 'fa',
      url: 'https://www.furaffinity.net/user/$1'
    }
  }
})
export class FurAffinity extends BaseWebsiteService implements WebsiteService {
  readonly BASE_URL: string = 'https://www.furaffinity.net';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await ehttp.get(`${this.BASE_URL}/controls/submissions`, profileId, {
      updateCookies: true,
      headers: {
        'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
      }
    });
    try {
      const body = response.body;
      if (body.includes('logout-link')) {
        const aTags = HTMLParser.getTagsOf(body, 'a');
        const matcher = /href="\/user\/.*"/g;

        // This code is a bit messy and is marked for refactor
        if (aTags.length > 0) {
          for (let i = 0; i < aTags.length; i++) {
            let tag = aTags[i];
            if (tag.match(matcher)) {
              returnValue.username = tag.match(matcher)[0].split('/')[2] || null
              returnValue.status = LoginStatus.LOGGED_IN;
              break;
            }
          }
        }

        this._getFolders(profileId, body);
      } else {
        this.userInformation.delete(profileId);
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  private async _getFolders(profileId: string, html: string): Promise<void> {
    const info: UserInformation = {
      folders: []
    };

    try {
      const furAffinityFolders: { [key: string]: Folder } = { Ungrouped: { title: 'Ungrouped', subfolders: [] } };
      const select = html.match(/<select(.|\s)*?(?=\/select)/g)[0] + '/select>';
      const element = $.parseHTML(select);
      let options = $(element).find('option') || [];

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];

        if (opt.value === '0') continue;

        if (opt.parentElement.tagName === 'OPTGROUP') {
          if (!furAffinityFolders[opt.parentElement.label]) {
            furAffinityFolders[opt.parentElement.label] = {
              title: opt.parentElement.label,
              subfolders: []
            };
          }

          furAffinityFolders[opt.parentElement.label].subfolders.push({
            title: opt.innerHTML.replace(/\[.*\]/, '').trim(),
            id: opt.value
          });
        } else {
          furAffinityFolders.Ungrouped.subfolders.push({
            title: opt.innerHTML.replace(/\[.*\]/, '').trim(),
            id: opt.value
          });
        }
      }

      info.folders = Object.keys(furAffinityFolders).map(key => {
        return { title: key, subfolders: furAffinityFolders[key].subfolders };
      }) || [];
    } catch (e) { /* */ }

    this.userInformation.set(profileId, info);
  }

  public getFolders(profileId: string): Folder[] {
    return this.userInformation.get(profileId).folders;
  }

  private getContentType(type: TypeOfSubmission): string {
    if (type === TypeOfSubmission.ART) return 'submission';
    if (type === TypeOfSubmission.AUDIO) return 'music';
    if (type === TypeOfSubmission.STORY) return 'story';
    if (type === TypeOfSubmission.ANIMATION) return 'flash';
    return 'submission';
  }

  private getRating(rating: SubmissionRating): any {
    if (rating === SubmissionRating.GENERAL) return 0;
    if (rating === SubmissionRating.MATURE) return 2;
    if (rating === SubmissionRating.EXTREME || rating === SubmissionRating.ADULT) return 1;
    return 0;
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
    const page = await ehttp.get(`${this.BASE_URL}/controls/journal`, postData.profileId, {
      cookies
    });
    const data: any = {
      key: HTMLParser.getInputValue(page.body, 'key'),
      message: postData.description,
      subject: postData.title,
      submit: 'Create / Update Journal',
      id: '',
      do: 'update'
    };

    if (postData.options.feature) data.make_featured = 'on';

    const response = await ehttp.post(`${this.BASE_URL}/controls/journal/`, postData.profileId, data, {
      multipart: true,
      cookies
    });

    if (!response.success) {
      return Promise.reject(this.createPostResponse('Unknown error occurred', response.body));
    } else {
      return this.createPostResponse(null);
    }
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const initData = {
      part: '2',
      submission_type: this.getContentType(postData.typeOfSubmission)
    };

    const part1Response = await ehttp.post(`${this.BASE_URL}/submit/`, postData.profileId, initData, {
      cookies,
    });
    if (!part1Response.success) {
      return Promise.reject(this.createPostResponse('Unknown error', part1Response.body));
    } else {
      const part1Body = part1Response.body;
      if (part1Body.includes('Flood protection')) {
        return Promise.reject(this.createPostResponse('Encountered flood protection', {}))
      }

      const part2Data = {
        part: '3',
        key: HTMLParser.getInputValue(part1Body, 'key'),
        submission_type: this.getContentType(postData.typeOfSubmission),
        thumbnail: fileAsFormDataObject(postData.thumbnail),
        submission: fileAsFormDataObject(postData.primary),
      };

      const uploadResponse = await ehttp.post(`${this.BASE_URL}/submit/`, postData.profileId, part2Data, {
        cookies,
        multipart: true,
        headers: {
          'Host': 'www.furaffinity.net',
          'Referer': 'http://www.furaffinity.net/submit/'
        }
      });
      if (!uploadResponse.success) {
        return Promise.reject(this.createPostResponse('Unknown error', uploadResponse.body));
      } else {
        const uploadBody = uploadResponse.body;
        if (uploadBody.includes('Flood protection')) {
          return Promise.reject(this.createPostResponse('Encountered flood protection', {}))
        }

        if (uploadBody.includes('pageid-error') || !uploadBody.includes('pageid-submit-finalize')) {
          return Promise.reject(this.createPostResponse('Unknown error', uploadBody));
        }

        const options = postData.options || {};
        const finalizeData: any = {
          part: '5',
          key: HTMLParser.getInputValue(uploadBody, 'key'),
          title: postData.title,
          keywords: this.formatTags(postData.tags, []),
          message: postData.description,
          submission_type: this.getContentType(postData.typeOfSubmission),
          rating: this.getRating(submission.rating),
          cat_duplicate: '',
          create_folder_name: '',
          cat: options.category,
          atype: options.theme,
          species: options.species,
          gender: options.gender
        };

        if (options.disableComments) finalizeData.lock_comments = 'on';
        if (options.scraps) finalizeData.scrap = '1';

        if (options.folders) {
          finalizeData['folder_ids[]'] = options.folders;
        }

        const postResponse = await ehttp.post(`${this.BASE_URL}/submit/`, postData.profileId, finalizeData, {
          cookies,
          multipart: true
        });

        if (!postResponse.success) {
          return Promise.reject(this.createPostResponse(null, postResponse.body));
        } else {
          const body = postResponse.body;

          if (body.includes('CAPTCHA verification error')) {
            return Promise.reject(this.createPostResponse('You must have 5+ posts on your account first', body));
          }

          if (body.includes('pageid-submit-finalize')) {
            return Promise.reject(this.createPostResponse('Unknown error', body));
          }

          if (postResponse.href.includes('/submit')) {
            return Promise.reject(this.createPostResponse('Something went wrong', body));
          }

          try {
            if (postData.typeOfSubmission == TypeOfSubmission.ART && options.reupload) {
              const submissionId = HTMLParser.getInputValue(body, 'submission_ids[]');
              const reuploadData: any = {
                update: 'yes', // always seems to be 'yes'
                newsubmission: fileAsFormDataObject(postData.primary),
              };

              await ehttp.post(`${this.BASE_URL}/controls/submissions/changesubmission/${submissionId}`, postData.profileId, reuploadData, { cookies, multipart: true });
            }
          } catch (e) {
            console.error(e);
          } finally {
            const res = this.createPostResponse(null);
            res.srcURL = postResponse.href;
            return res;
          }
        }
      }
    }
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const maxLength = 250;
    const tags = super.formatTags(defaultTags, other);
    const filteredTags = tags.filter(tag => tag.length >= 3);
    let tagString = filteredTags.join(' ').trim();
    if (tagString.length > maxLength) {
      let fitTags = [];
      filteredTags.forEach(tag => {
        if (fitTags.join(' ').length + 1 + tag.length < maxLength) {
          fitTags.push(tag);
        }
      });
      tagString = fitTags.join(' ');
    }

    return tagString.length > maxLength ? tagString.substring(0, maxLength) : tagString;
  }

}
