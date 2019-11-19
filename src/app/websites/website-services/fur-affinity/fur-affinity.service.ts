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
import { UsernameParser } from 'src/app/utils/helpers/description-parsers/username.parser';

const ACCEPTED_FILES = ['jpg', 'gif', 'png', 'jpeg', 'jpg', 'swf', 'doc', 'docx', 'rtf', 'txt', 'pdf', 'odt', 'mid', 'wav', 'mp3', 'mpeg', 'mpg'];

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  if (!supportsFileType(submission.fileInfo, ACCEPTED_FILES)) {
    problems.push(['Does not support file format', { website: 'Fur Affinity', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(10) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: `Fur Affinity`, value: '10MB' }]);
  }

  return problems;
}

function preparser(html: string): string {
  return UsernameParser.replaceText(html, 'fa', ':icon$1:', (str) => str.replace(/_/g, ''));
}

function descriptionParser(bbcode: string): string {
  if (!bbcode) return '';
  return bbcode.replace(/\[hr\]/g, '-----');
}

@Injectable({
  providedIn: 'root'
})
@Website({
  acceptedFiles: ACCEPTED_FILES,
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
  private cloudflareActive: boolean = false;

  constructor() {
    super();
  }

  public async checkCloudflare(profileId: string): Promise<boolean> {
    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(this.BASE_URL, this.BASE_URL, cookies, profileId);
    try {
      if (response.body.includes('Cloudflare')) {
        this.cloudflareActive = true;
        return true;
      } else {
        this.cloudflareActive = false;
        return false;
      }
    } catch (e) {
      // Swallow
    }

    return false;
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    let response: any;
    if (this.cloudflareActive) {
      response = await ehttp.get(`${this.BASE_URL}/controls/submissions`, profileId, {
        updateCookies: true,
        headers: {
          'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
        }
      });
    } else {
      response = await got.get(`${this.BASE_URL}/controls/submissions`, this.BASE_URL, cookies, profileId);
    }
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

  private getContentCategory(type: TypeOfSubmission): string {
    if (type === TypeOfSubmission.ART) return '1';
    if (type === TypeOfSubmission.AUDIO) return '16';
    if (type === TypeOfSubmission.STORY) return '13';
    if (type === TypeOfSubmission.ANIMATION) return '7';
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
    const page = await got.get(`${this.BASE_URL}/controls/journal`, this.BASE_URL, cookies, postData.profileId);
    const data: any = {
      key: HTMLParser.getInputValue(page.body, 'key'),
      message: postData.description,
      subject: postData.title,
      submit: 'Create / Update Journal',
      id: '',
      do: 'update'
    };

    if (postData.options.feature) data.make_featured = 'on';

    const response = await got.post(`${this.BASE_URL}/controls/journal/`, data, this.BASE_URL, cookies);
    if (response.error) {
      return Promise.reject(this.createPostResponse('Unknown error occurred', response.error));
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

    const part1Response = await got.post(`${this.BASE_URL}/submit/`, initData, this.BASE_URL, cookies);
    if (part1Response.error) {
      return Promise.reject(this.createPostResponse('Unknown error', part1Response.error));
    } else {
      const part1Body = part1Response.success.body;
      if (part1Body.includes('Flood protection')) {
        return Promise.reject(this.createPostResponse('Encountered flood protection', {}))
      }

      const part2Data = {
        key: HTMLParser.getInputValue(part1Body, 'key'),
        part: '3',
        submission: fileAsFormDataObject(postData.primary),
        thumbnail: fileAsFormDataObject(postData.thumbnail),
        submission_type: this.getContentType(postData.typeOfSubmission)
      };

      const uploadResponse = await got.post(`${this.BASE_URL}/submit/`, part2Data, this.BASE_URL, cookies, {
        headers: {
          'Host': 'www.furaffinity.net',
          'Referer': 'http://www.furaffinity.net/submit/'
        }
      });
      if (uploadResponse.error) {
        return Promise.reject(this.createPostResponse('Unknown error', uploadResponse.error));
      } else {
        const uploadBody = uploadResponse.success.body;
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
          rating: this.getRating(postData.rating),
          cat_duplicate: '',
          create_folder_name: '',
          cat: options.category,
          atype: options.theme,
          species: options.species,
          gender: options.gender
        };

        if (postData.typeOfSubmission !== TypeOfSubmission.ART) {
          delete finalizeData.cat;
          finalizeData.cat_duplicate = this.getContentCategory(postData.typeOfSubmission);
        }

        if (options.disableComments) finalizeData.lock_comments = 'on';
        if (options.scraps) finalizeData.scrap = '1';

        if (options.folders) {
          finalizeData['folder_ids[]'] = options.folders;
        }

        const postResponse = await got.post(`${this.BASE_URL}/submit/`, finalizeData, this.BASE_URL, cookies, {
          qsStringifyOptions: { arrayFormat: 'repeat' },
        });

        if (postResponse.error) {
          return Promise.reject(this.createPostResponse(null, postResponse.error));
        } else {
          const body = postResponse.success.body;

          if (body.includes('CAPTCHA verification error')) {
            return Promise.reject(this.createPostResponse('You must have 5+ posts on your account first', body));
          }

          if (body.includes('pageid-submit-finalize')) {
            return Promise.reject(this.createPostResponse('Unknown error', body));
          }

          if (postResponse.success.response.request.uri.href.includes('/submit')) {
            return Promise.reject(this.createPostResponse('Something went wrong', body));
          }

          try {
            if (postData.typeOfSubmission == TypeOfSubmission.ART && options.reupload) {
              const submissionId = HTMLParser.getInputValue(body, 'submission_ids[]');
              const reuploadData: any = {
                update: 'yes', // always seems to be 'yes'
                newsubmission: fileAsFormDataObject(postData.primary),
              };

              await got.post(`${this.BASE_URL}/controls/submissions/changesubmission/${submissionId}`, reuploadData, this.BASE_URL, cookies);
            }
          } catch (e) {
            console.error(e);
          } finally {
            const res = this.createPostResponse(null);
            res.srcURL = postResponse.success.response.request.uri.href;
            return res;
          }
        }
      }
    }
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const maxLength = 250;
    const tags = super.formatTags(defaultTags, other).map(tag => tag.replace(/(\/|\\)/gm, '_'));
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
