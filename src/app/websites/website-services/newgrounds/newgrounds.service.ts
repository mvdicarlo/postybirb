import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { MBtoBytes, fileAsFormDataObject, fileAsBlob } from 'src/app/utils/helpers/file.helper';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { NewgroundsSubmissionForm } from './components/newgrounds-submission-form/newgrounds-submission-form.component';
import { BaseWebsiteService } from '../base-website-service';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import * as dotProp from 'dot-prop';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import { GenericJournalSubmissionForm } from '../../components/generic-journal-submission-form/generic-journal-submission-form.component';
import { SubmissionType } from 'src/app/database/tables/submission.table';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];

  const options = dotProp.get(formData, 'Newgrounds.options', {});
  if (!options.nudity || !options.violence || !options.text || !options.adult) {
    problems.push(['Options are incomplete', { website: 'Newgrounds' }]);
  }

  if (!supportsFileType(submission.fileInfo, ['jpeg', 'jpg', 'png', 'gif', 'bmp'])) {
    problems.push(['Does not support file format', { website: 'Newgrounds', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(40) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: `Newgrounds`, value: '40MB' }]);
  }

  return problems;
}

function descriptionParse(html: string): string {
  return html
    .replace(/<div/gm, '<p')
    .replace(/<\/div>/gm, '</p>');
}

@Injectable({
  providedIn: 'root'
})
@Website({
  displayedName: 'Newgrounds',
  login: {
    url: 'https://www.newgrounds.com/login'
  },
  components: {
    submissionForm: NewgroundsSubmissionForm,
    journalForm: GenericJournalSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [descriptionParse],
    usernameShortcut: {
      code: 'ng',
      url: 'https://$1.newgrounds.com'
    }
  }
})
export class Newgrounds extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://www.newgrounds.com'

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(this.BASE_URL, this.BASE_URL, cookies, null);
    try {
      const body = response.body;
      if (!body.includes('passport_login')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = body.match(/"name":".*?"/g)[0].split(':')[1].replace(/"/g, '');
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

  public async postJournal(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const uploadPage = await got.get(`${this.BASE_URL}/account/news/post`, this.BASE_URL, cookies, null);

    const userkey: string = HTMLParser.getInputValue(uploadPage.body, 'userkey');
    const data: any = {
      post_id: '',
      userkey,
      subject: postData.title,
      emoticon: '6',
      comments_pref: '1',
      tag: '',
      'tags[]': this.formatTags(postData.tags, []),
      body: `<p>${postData.description}</p>`
    };

    const postResponse = await got.post(`${this.BASE_URL}/account/news/post`, data, this.BASE_URL, cookies, {
      qsStringifyOptions: { arrayFormat: 'repeat' },
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://www.newgrounds.com',
        'Referer': `https://www.newgrounds.com/account/news/post`,
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': '*',
        'Content-Type': 'multipart/form-data'
      }
    });

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    try {
      const res: any = JSON.parse(postResponse.success.body);
      if (res.url) {
        return this.createPostResponse(null);
      } else {
        return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body));
      }
    } catch (err) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body));
    }
  }

  public async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const uploadPage = await got.get(`${this.BASE_URL}/art/submit/create`, this.BASE_URL, cookies, null);

    const userkey: string = HTMLParser.getInputValue(uploadPage.body, 'userkey');

    const uuid = URL.createObjectURL(fileAsBlob(postData.primary));

    const fileData: any = {
      userkey,
      qquuid: uuid,
      qqfilename: postData.primary.fileInfo.name,
      qqtotalfilesize: postData.primary.fileInfo.size,
      qqfile: fileAsFormDataObject(postData.primary)
    };

    const park = await got.post(`${this.BASE_URL}/parkfile`, fileData, this.BASE_URL, cookies, {
      headers: {
        'Origin': 'https://www.newgrounds.com',
        'Referer': `https://www.newgrounds.com/art/submit/create`,
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
        'TE': 'Trailers',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (park.error) {
      return Promise.reject(this.createPostResponse('Unknown error', park.error));
    }

    const json = JSON.parse(park.success.body);
    if (!json.success) {
      return Promise.reject(this.createPostResponse(park.success.body, park.success.body));
    }

    const cookies2 = [];
    park.success.response.headers['set-cookie'].forEach(c => {
      const cParts = c.split(';')[0].split('=');
      cookies2.push({
        value: cParts[1],
        name: cParts[0]
      });
    });

    const options = postData.options;
    const thumbfile = postData.thumbnail ? postData.thumbnail : postData.primary;
    const nativeImg = nativeImage.createFromBuffer(thumbfile.buffer);
    const sizes = nativeImg.getSize();

    const data2: any = {
      userkey,
      title: postData.title,
      description: `<p>${postData.description}</p>`,
      thumbnail: fileAsFormDataObject(thumbfile),
      cc_commercial: options.commercial ? 'yes' : 'no',
      cc_modification: options.modification ? 'yes' : 'no',
      category_id: options.category,
      nudity: options.nudity,
      violence: options.violence,
      language_textual: options.text,
      adult_themes: options.adult,
      encoder: 2,
      thumb_crop_width: sizes.width,
      thumb_crop_height: sizes.height,
      thumb_top_x: 0,
      thumb_top_y: 0,
      thumb_animation_frame: 0,
      'tags[]': this.formatTags(postData.tags, []),
      parked_id: json.parked_id,
      parked_url: json.parked_url
    };

    if (options.creativeCommons) {
      data2.use_creative_commons = 1;
    }

    if (!options.sketch) {
      data2.public = '1';
    }

    const optionsPost = await got.post(`${this.BASE_URL}/art/submit/create`, data2, this.BASE_URL, cookies2, {
      qsStringifyOptions: { arrayFormat: 'repeat' },
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://www.newgrounds.com',
        'Referer': `https://www.newgrounds.com/art/submit/create`,
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': '*',
        'Content-Type': 'multipart/form-data',
        'TE': 'Trailers'
      }
    });

    if (optionsPost.error) {
      return Promise.reject(this.createPostResponse('Unknown error', optionsPost.error));
    }

    if (optionsPost.success.response.statusCode === 200) {
      const successJson = JSON.parse(optionsPost.success.body);
      const res = this.createPostResponse(null);
      res.srcURL = successJson.url;
      return res;
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', optionsPost.success.body));
    }
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    return super.formatTags(defaultTags, other, '-')
      .map(tag => { return tag.replace(/(\(|\)|:|#|;|\]|\[|')/g, '').replace(/_/g, '-') })
      .slice(0, 12);
  }
}
