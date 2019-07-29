import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { SubmissionFormData, Submission } from 'src/app/database/models/submission.model';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes, fileAsFormDataObject, fileAsBlob } from 'src/app/utils/helpers/file.helper';
import { BaseWebsiteService } from '../base-website-service';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { FurryAminoSubmissionForm } from './components/furry-amino-submission-form/furry-amino-submission-form.component';
import { GenericJournalSubmissionForm } from '../../components/generic-journal-submission-form/generic-journal-submission-form.component';
import { SubmissionType } from 'src/app/database/tables/submission.table';
import { ISubmissionFileWithArray } from 'src/app/database/tables/submission-file.table';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const supportedFiles: string[] = ['jpg', 'jpeg', 'png', 'gif'];
  if (!supportsFileType(submission.fileInfo, supportedFiles)) {
    problems.push(['Does not support file format', { website: 'Furry Amino', value: submission.fileInfo.type }]);
  }

  if (submission.additionalFileInfo && submission.additionalFileInfo.length) {
    submission.additionalFileInfo
      .filter(info => !supportsFileType(info, supportedFiles))
      .forEach(info => problems.push(['Does not support file format', { website: 'Furry Amino', value: info.type }]));
  }

  if (MBtoBytes(10) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'Furry Amino', value: `10MB` }]);
  }

  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  additionalFiles: true,
  displayedName: 'Furry Amino',
  login: {
    url: 'https://aminoapps.com/c/furry-amino/home/'
  },
  components: {
    submissionForm: FurryAminoSubmissionForm,
    journalForm: GenericJournalSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [PlaintextParser.parse],
  }
})
export class FurryAmino extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://aminoapps.com/c/furry-amino/home';
  readonly COOKIES_URL: string = 'https://aminoapps.com/'; // need to track specific url for cookies
  public categories: any[] = [];

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.COOKIES_URL);
    const response = await got.get(`${this.BASE_URL}`, this.BASE_URL, cookies, profileId);
    try {
      const body = response.body;
      if (!body.includes('Sign In')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        const aTags = HTMLParser.getTagsOf(body, 'a') || [];
        for (let i = 0; i < aTags.length; i++) {
          const tag = aTags[i];
          if (tag.includes('user-link')) {
            returnValue.username = tag.match(/user\/.*?(?=\/)/g)[0].split('/')[1].trim();
            break;
          }
        }
        this.userInformation.set(profileId, { ndcId: body.match(/"ndcId": ".*?"/g)[0].split(':')[1].replace(/\D/g, '').trim() })
        await this._loadCategories(profileId, cookies);
      } else {
        this.userInformation.delete(profileId);
      }
    } catch (e) {
      console.error(e);
    }

    return returnValue;
  }

  private async _loadCategories(profileId: string, cookies: any[]): Promise<void> {
    if (this.categories.length) return;

    const ndcId = this.userInformation.get(profileId).ndcId;
    const categoryRequest = await got.get(`https://aminoapps.com/api/get-blog-category?ndcId=${ndcId}`, this.COOKIES_URL, cookies, profileId);
    const result: any[] = JSON.parse(categoryRequest.body).result;
    const categories: any[] = [];
    for (let i = 0; i < result.length; i++) {
      const category = result[i];
      if (category.type == 1) {
        categories.push({
          label: category.label,
          nested: []
        });
      } else {
        categories[categories.length - 1].nested.push({
          label: category.label,
          categoryId: category.categoryId
        });
      }
    }

    this.categories = categories;
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
    const cookies = await getCookies(postData.profileId, this.COOKIES_URL);
    const data: any = {
      ndcId: this.userInformation.get(postData.profileId).ndcId,
      postJSON: {
        content: postData.description,
        extensions: {
          fansOnly: false
        },
        taggedBlogCategoryIdList: '',
        title: postData.title,
        type: 0
      }
    };

    const postRequest = await got.post('https://aminoapps.com/api/blog', null, this.COOKIES_URL, cookies, {
      encoding: null,
      gzip: true,
      json: data,
      headers: {
        'X-Requested-With': 'xmlhttprequest',
        'Host': 'aminoapps.com',
        'Origin': 'https://aminoapps.com',
        'Referer': `https://aminoapps.com/partial/compose-post?ndcId=${data.ndcId}&type=create`,
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': '*/*',
        'Content-Type': 'application/json'
      }
    });

    if (postRequest.error) {
      return Promise.reject(this.createPostResponse('Unknown error', null));
    }

    const json = postRequest.success.body;
    if (json.code === 200) {
      return this.createPostResponse(null);
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', null));
    }
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.COOKIES_URL);

    const mediaIds = await Promise.all([this._postImage(postData.primary, cookies), ...postData.additionalFiles.map(f => this._postImage(f, cookies))]);
    const mediaList: any[] = [];
    let content: string = '';
    for (let i = 0; i < mediaIds.length; i++) {
      content += `[IMG=${i}] `;
      mediaList.push([
        100,
        mediaIds[i],
        "",
        `${i}`
      ]);
    }

    content += postData.description;

    const data: any = {
      ndcId: this.userInformation.get(postData.profileId).ndcId,
      postJSON: {
        content,
        extensions: {
          fansOnly: false
        },
        mediaList,
        taggedBlogCategoryIdList: postData.options.categories,
        title: postData.title,
        type: 0
      }
    };

    const postRequest = await got.post('https://aminoapps.com/api/blog', null, this.COOKIES_URL, cookies, {
      encoding: null,
      gzip: true,
      json: data,
      headers: {
        'X-Requested-With': 'xmlhttprequest',
        'Host': 'aminoapps.com',
        'Origin': 'https://aminoapps.com',
        'Referer': `https://aminoapps.com/partial/compose-post?ndcId=${data.ndcId}&type=create`,
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': '*/*',
        'Content-Type': 'application/json'
      }
    });

    if (postRequest.error) {
      return Promise.reject(this.createPostResponse('Unknown error', null));
    }

    const json = postRequest.success.body;
    if (json.code === 200) {
      const res = this.createPostResponse(null);
      res.srcURL = json.result.blogURL;
      return res;
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', null));
    }
  }

  private _postImage(file: ISubmissionFileWithArray, cookies: any[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const uuid = URL.createObjectURL(fileAsBlob(file));

      const data: any = {
        qqparentuuid: uuid.split('///')[1],
        qquuid: uuid.split('///')[1],
        qqparentsize: file.fileInfo.size,
        qqtotalfilesize: file.fileInfo.size,
        qqfilename: file.fileInfo.name,
        avatar: fileAsFormDataObject(file)
      };

      got.post('https://aminoapps.com/api/upload-image', data, this.COOKIES_URL, cookies)
        .then(res => {
          const json = JSON.parse(res.success.body);
          if (json.code === 200) {
            resolve(json.result.mediaValue);
          } else {
            reject(res.success.body);
          }
        }).catch(err => reject(err));
    });
  }
}
