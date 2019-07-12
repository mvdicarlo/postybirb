import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { BaseWebsiteService } from '../base-website-service';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes, fileAsFormDataObject, fileAsBlob } from 'src/app/utils/helpers/file.helper';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { PatreonSubmissionForm } from './components/patreon-submission-form/patreon-submission-form.component';
import { GenericJournalSubmissionForm } from '../../components/generic-journal-submission-form/generic-journal-submission-form.component';
import { SubmissionType } from 'src/app/database/tables/submission.table';
import { TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { ISubmissionFileWithArray } from 'src/app/database/tables/submission-file.table';
import { BrowserWindowHelper } from 'src/app/utils/helpers/browser-window.helper';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  if (!supportsFileType(submission.fileInfo, ['png', 'jpeg', 'jpg', 'gif', 'midi', 'ogg', 'oga', 'wav', 'x-wav', 'webm', 'mp3', 'mpeg', 'pdf', 'txt', 'rtf', 'md'])) {
    problems.push(['Does not support file format', { website: 'Patreon', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(200) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'Patreon', value: '200MB' }]);
  }

  return problems;
}

function descriptionParse(html: string): string {
  if (!html) return '';
  return html
    .replace(/\n/g, '')
    .replace(/<p/gm, '<div')
    .replace(/<\/p>/gm, '</div>')
    .replace(/(<s>|<\/s>)/g, '')
    .replace(/<hr \/>/g, '');
}

@Injectable({
  providedIn: 'root'
})
@Website({
  additionalImages: true,
  login: {
    url: 'https://www.patreon.com/login'
  },
  components: {
    submissionForm: PatreonSubmissionForm,
    journalForm: GenericJournalSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [descriptionParse],
    usernameShortcut: {
      code: 'pa',
      url: 'https://www.patreon.com/$1'
    }
  }
})
export class Patreon extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://www.patreon.com';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/user`, this.BASE_URL, cookies, profileId);
    try {
      const body = response.body;
      if (!body.toLowerCase().includes('log in') && !body.includes('Cloudflare')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        const title = body.match(/<title(.|\s)*?(?=\/title)/)[0] || '';
        const user = title.length > 0 ? title.split(' ')[0].replace('<title>', '') : undefined;
        returnValue.username = user;
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
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

  private async _getCSRF(cookies: any[], profileId): Promise<string> {
    const uploadPage = await got.get(`${this.BASE_URL}/post`, this.BASE_URL, cookies, profileId);
    const body = uploadPage.body;
    return body.match(/csrfSignature = ".*"/g)[0].split('"')[1];
  }

  private async postJournal(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const csrf = await this._getCSRF(cookies, postData.profileId);

    const createData = {
      data: {
        type: 'post',
        attributes: {
          post_type: 'text_only'
        }
      }
    };

    const create = await got.post(`${this.BASE_URL}/api/posts?json-api-version=1.0`, null, this.BASE_URL, cookies, {
      json: createData,
      headers: {
        'X-CSRF-Signature': csrf
      }
    });

    if (create.error) {
      return Promise.reject(this.createPostResponse('Unknown error', create.error));
    }

    const response: any = create.success.body;
    const link = response.links.self;

    const formattedTags = this.formatTags(postData.tags, []);
    const relationshipTags = formattedTags.map(tag => {
      return {
        id: tag.id,
        type: tag.type
      }
    });

    const attributes = {
      content: postData.description,
      post_type: 'text_only',
      is_paid: false,
      min_cents_pledged_to_view: 0,
      title: postData.title,
      tags: { publish: true }
    };

    const relationships = {
      post_tag: {
        data: relationshipTags.length > 0 ? relationshipTags[0] : {}
      },
      user_defined_tags: {
        data: relationshipTags
      }
    };

    const data = {
      data: {
        attributes,
        relationships,
        type: 'post'
      },
      included: formattedTags
    };

    const postResponse = await got.patch(`${link}?json-api-version=1.0`, null, this.BASE_URL, cookies, {
      json: data,
      headers: {
        'X-CSRF-Signature': csrf
      }
    });

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    if (postResponse.success.response.statusCode === 200) {
      return this.createPostResponse(null);
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', JSON.stringify(postResponse.success.body)));
    }
  }

  private _getPostType(type: TypeOfSubmission): any {
    if (type === TypeOfSubmission.ART) return 'image_file';
    if (type === TypeOfSubmission.AUDIO) return 'audio_file';
    if (type === TypeOfSubmission.STORY) return 'text_only';
    return 'image_file';
  }

  private async _uploadFile(id: string, file: ISubmissionFileWithArray, attachment: boolean, cookies: any[], csrf: string, partitionId: string): Promise<any> {
    const uuid = URL.createObjectURL(fileAsBlob(file));

    const data: any = {
      data: {
        attributes: {
          state: 'pending_upload',
          owner_id: id,
          owner_type: 'post',
          owner_relationship: 'main',
          file_name: file.fileInfo.name
        },
        type: 'media'
      }
    };

    const idk = await got.get(`${this.BASE_URL}/REST/auth/CSRFTicket?uri=${encodeURIComponent(`"/posts/${id}/edit&json-api-version=1.0`)}`, this.BASE_URL, cookies, partitionId);

    const upload = await got.crPost(`${this.BASE_URL}/api/media?json-api-version=1.0`, {
      'X-CSRF-Signature': csrf,
      'Host': 'www.patreon.com',
      'Referer': `https://www.patreon.com/posts/${id}/edit`,
      'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; '),
      'Cache-Control': 'no-cache',
      'Accept': '*/*',
      'Pragma': 'no-cache',
    }, partitionId, data, true);

    try {
      const body: any = JSON.parse(upload.body);
      const amazonData = body.data.attributes.upload_parameters;
      amazonData.file = fileAsFormDataObject(file);

      const sendFile = await got.crPost(body.data.attributes.upload_url, {
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Host': 'patreon-media.s3-accelerate.amazonaws.com',
        'Origin': 'https://www.patreon.com',
        'Referer': 'https://www.patreon.com/',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Keep-Alive': 300,
        'Access-Control-Request-Method': 'POST'
      }, partitionId, amazonData, false);

      if (sendFile.body.includes('Error')) {
        return Promise.reject(this.createPostResponse('Problem uploading file', sendFile.body));
      }

      return body;
    } catch (err) {
      return Promise.reject(this.createPostResponse('Problem uploading file', upload.body));
    }
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    let cookies = await getCookies(postData.profileId, this.BASE_URL);
    const csrf = await this._getCSRF(cookies, postData.profileId);

    const createData = {
      data: {
        type: 'post',
        attributes: {
          post_type: this._getPostType(postData.typeOfSubmission)
        }
      }
    };

    await BrowserWindowHelper.hitUrl(postData.profileId, 'https://www.patreon.com/posts/new?ru=%2Fhome');
    cookies = await getCookies(postData.profileId, this.BASE_URL)

    const create = await got.crPost(`${this.BASE_URL}/api/posts?fields[post]=post_type%2Cpost_metadata&json-api-version=1.0&include=[]`, {
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Content-Type': 'application/vnd.api+json',
            'Host': 'www.patreon.com',
            'Origin': 'https://www.patreon.com',
            'Pragma': 'no-cache',
            'Referer': 'https://www.patreon.com/posts/new',
            'X-CSRF-Signature': csrf,
            'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
          }, postData.profileId, createData, true);

    if (!create.body || !create.body.includes('self')) {
      return Promise.reject(this.createPostResponse('Unknown error', create.body));
    }

    const response: any = JSON.parse(create.body);
    const link = response.data.id;

    const primaryFileUpload = await this._uploadFile(link, postData.primary, postData.typeOfSubmission === TypeOfSubmission.STORY, cookies, csrf, postData.profileId);
    let uploadJSON: any = JSON.stringify(primaryFileUpload);
    if (uploadJSON.errors && uploadJSON.errors) {
      return Promise.reject(this.createPostResponse(uploadJSON.errors.map(err => `${err.code_name}: ${err.detail}\n`), uploadJSON.errors));
    }

    for (let i = 0; i < postData.additionalFiles.length; i++) {
      const upload = await this._uploadFile(link, postData.additionalFiles[i], true, cookies, csrf, postData.profileId);
      uploadJSON = JSON.stringify(upload);
      if (uploadJSON.errors && uploadJSON.errors) {
        return Promise.reject(this.createPostResponse(uploadJSON.errors.map(err => `${err.code_name}: ${err.detail}\n`), uploadJSON.errors));
      }
    }

    const options = postData.options;

    const formattedTags = this.formatTags(postData.tags, []);
    const relationshipTags = formattedTags.map(tag => {
      return {
        id: tag.id,
        type: tag.type
      }
    });

    const attributes: any = {
      content: postData.description,
      post_type: this._getPostType(postData.typeOfSubmission),
      is_paid: options.chargePatrons,
      min_cents_pledged_to_view: options.patronsOnly ? (options.minimumDollarsToView || 0) * 100 || 1 : (options.minimumDollarsToView || 0) * 100,
      title: postData.title,
      tags: { publish: true }
    };

    if (options.schedule) {
      attributes.scheduled_for = options.schedule.toISOString().split('.')[0];
      attributes.tags.publish = false;
    }

    const relationships = {
      post_tag: {
        data: relationshipTags.length > 0 ? relationshipTags[0] : {}
      },
      user_defined_tags: {
        data: relationshipTags
      }
    };

    const data: any = {
      data: {
        attributes,
        relationships,
        type: 'post'
      },
      included: formattedTags
    };

    const postResponse = await got.patch(`${link}?json-api-version=1.0`, null, this.BASE_URL, cookies, {
      json: data,
      headers: {
        'X-CSRF-Signature': csrf,
        'Host': 'www.patreon.com',
        'Referer': 'https://www.patreon.com/posts',
        'Origin': 'https://www.patreon.com',
        'Accept': '*/*'
      }
    });

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    if (postResponse.success.response.statusCode === 200) {
      const res = this.createPostResponse(null);
      res.srcURL = `${this.BASE_URL}${postResponse.success.body.data.attributes.patreon_url}`;
      return res;
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', JSON.stringify(postResponse.success.body)));
    }
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const tags = [...defaultTags, ...other].slice(0, 5);
    return tags.map(tag => {
      return {
        type: 'post_tag',
        id: `user_defined;${tag}`,
        attributes: {
          value: tag,
          cardinality: 1
        }
      };
    });
  }
}
