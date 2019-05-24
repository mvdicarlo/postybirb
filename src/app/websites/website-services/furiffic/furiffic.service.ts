import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { GenericSubmissionForm } from '../../components/generic-submission-form/generic-submission-form.component';
import { BBCodeParser } from 'src/app/utils/helpers/description-parsers/bbcode.parser';
import { BaseWebsiteService } from '../base-website-service';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { GenericJournalSubmissionForm } from '../../components/generic-journal-submission-form/generic-journal-submission-form.component';
import { SubmissionType, SubmissionRating } from 'src/app/database/tables/submission.table';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];

  if (!supportsFileType(submission.fileInfo, ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'doc', 'docx', 'rtf', 'pdf', 'txt', 'swf', 'flv', 'mp3', 'mp4'])) {
    problems.push(['Does not support file format', { website: 'Furiffic', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(25) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: `Furiffic`, value: '25MB' }]);
  }

  return problems;
}

function descriptionParse(bbcode: string): string {
  bbcode = bbcode.replace(/\n/g, '[lb]\n');
  bbcode = bbcode.replace(/\[hr\]/g, '\n----------\n');
  bbcode = bbcode.replace(/(\[size=\d+\]|\[\/size\])/g, ''); // does not support our size tag
  bbcode = bbcode
    .replace(/\[right\]/g, '[align=right]')
    .replace(/\[center\]/g, '[align=center]')
    .replace(/(\[\/center\]|\[\/right\])/g, '[/align]');

  return bbcode;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  login: {
    url: 'https://www.furiffic.com/'
  },
  components: {
    submissionForm: GenericSubmissionForm,
    journalForm: GenericJournalSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [BBCodeParser.parse, descriptionParse],
    usernameShortcut: {
      code: 'fr',
      url: 'https://www.furiffic.com/$1/info'
    }
  }
})
export class Furiffic extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://www.furiffic.com';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(this.BASE_URL, this.BASE_URL, cookies, profileId);
    try {
      const body = response.body;
      if (body.includes('logout')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = body.match(/"username":".*?"/g)[0].replace(/"/g, '').split(':')[1].trim() || null;
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  private getRating(rating: SubmissionRating): any {
    if (rating === SubmissionRating.GENERAL) return 'tame';
    if (rating === SubmissionRating.MATURE) return 'mature';
    if (rating === SubmissionRating.ADULT || rating === SubmissionRating.EXTREME) return 'adult';
    return 'tame';
  }

  public post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    if (submission.submissionType === SubmissionType.JOURNAL) {
      return this.postJournal(submission, postData);
    } else {
      return this.postSubmission(submission, postData);
    }
  }

  private async postJournal(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/${postData.loginInformation.username}/journals/create`, this.BASE_URL, cookies, postData.profileId);
    const body = response.body;

    const data: any = {
      type: 'textual',
      name: postData.title,
      link: '',
      body: `[p]${postData.description}[/p]`,
      shortDescription: postData.description.split('.')[0],
      thumbnailReset: '',
      thumbnailFile: '',
      visibility: 'public',
      rating: this.getRating(submission.rating),
      'tags[]': this.formatTags(postData.tags, []),
      __csrf: (((body.match(/csrfSeed = .*;/g) || [])[0] || '').split('=')[1] || '').replace(';', '').trim()
    };

    const postResponse = await got.post(`${this.BASE_URL}/${postData.loginInformation.username}/journals/create`, data, this.BASE_URL, cookies, {
      qsStringifyOptions: { arrayFormat: 'repeat' },
    });

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    return this.createPostResponse(null);
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const fileData: any = {
      'items[0][name]': postData.primary.fileInfo.name,
      'items[0][mimeType]': postData.primary.fileInfo.type,
      'items[0][size]': postData.primary.fileInfo.size,
      'items[0][clientId]': ''
    };

    const preuploadResponse = await got.post(`${this.BASE_URL}/${postData.loginInformation.username}/gallery/preupload`, fileData, this.BASE_URL, cookies);
    if (preuploadResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', preuploadResponse.error));
    }

    const id = JSON.parse(preuploadResponse.success.body)[''].id;
    const uploadData: any = {
      id,
      file: fileAsFormDataObject(postData.primary),
    }

    const fileResponse = await got.post(`${this.BASE_URL}/${postData.loginInformation.username}/gallery/upload`, uploadData, this.BASE_URL, cookies);
    if (fileResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', fileResponse.error));
    }

    const form = await got.post(`${this.BASE_URL}/${postData.loginInformation.username}/gallery/uploaddata`, { 'mediaIds[]': id }, this.BASE_URL, cookies);
    if (form.error) {
      return Promise.reject(this.createPostResponse('Unknown error', form.error));
    }

    const formData: any = JSON.parse(form.success.body);

    const infoData: any = {
      name: postData.title.substring(0, 30),
      rating: this.getRating(submission.rating),
      category: formData[0].category,
      visibility: 'public',
      folderVisibility: 'any',
      description: `[p]${postData.description}[/p]`,
      'tags[]': this.formatTags(postData.tags, [])
    };

    if (postData.thumbnail) {
      infoData.thumbnailFile = fileAsFormDataObject(postData.thumbnail);
      infoData['thumbnail[size][height]'] = '375';
      infoData['thumbnail[size][width]'] = '300';
      infoData['thumbnail[center][x]'] = '150';
      infoData['thumbnail[center][y]'] = '187.5';
      infoData['thumbnail[scale]'] = '0';
    } else {
      infoData.thumbnailfile = '';
    }

    const editResponse = await got.post(`${this.BASE_URL}/${postData.loginInformation.username}/edit/${id}`, infoData, this.BASE_URL, cookies, {
      qsStringifyOptions: { arrayFormat: 'repeat' },
    });

    if (editResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', editResponse.error));
    }

    const publish: any = {
      'ids[]': id
    };

    const postResponse = await got.post(`${this.BASE_URL}/${postData.loginInformation.username}/gallery/publish`, publish, this.BASE_URL, cookies);
    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    return this.createPostResponse(null);
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const tags = [...defaultTags, ...other];
    return tags.map((tag) => {
      return tag.trim().replace(/-/gm, ' ').replace(/(\/|\\)/gm, ' ');
    }).slice(0, 30);
  }
}
