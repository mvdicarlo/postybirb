import $ from 'jquery';

import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { SubmissionFormData, Submission } from 'src/app/database/models/submission.model';
import { BaseWebsiteService } from '../base-website-service';
import { WebsiteService, LoginStatus, WebsiteStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { GenericJournalSubmissionForm } from '../../components/generic-journal-submission-form/generic-journal-submission-form.component';
import { Folder } from '../../interfaces/folder.interface';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { FurryLifeSubmissionForm } from './components/furry-life-submission-form/furry-life-submission-form.component';
import { SubmissionRating, SubmissionType } from 'src/app/database/tables/submission.table';
import * as dotProp from 'dot-prop';
import { BrowserWindowHelper } from 'src/app/utils/helpers/browser-window.helper';

const ACCEPTED_FILES = ['jpeg', 'jpg', 'png', 'gif']

function validate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const supportedFiles: string[] = ACCEPTED_FILES;

  if (!supportsFileType(submission.fileInfo, supportedFiles)) {
    problems.push(['Does not support file format', { website: 'FurryLife', value: submission.fileInfo.type }]);
  }

  if (submission.additionalFileInfo && submission.additionalFileInfo.length) {
    submission.additionalFileInfo
      .filter(info => !supportsFileType(info, supportedFiles))
      .forEach(info => problems.push(['Does not support file format', { website: 'FurryLife', value: info.type }]));
  }

  if (MBtoBytes(1023) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'FurryLife', value: '1023MB' }]);
  }

  const options = dotProp.get(formData, 'FurryLife.options', { folder: '0-sfw' });
  if (options.folder) {
    const rating = (formData[FurryLife.name] || {}).rating || submission.rating;
    const isNSFW: boolean = rating !== SubmissionRating.GENERAL;
    const isNSFWFolder: boolean = options.folder.includes('nsfw');
    if (isNSFW && !isNSFWFolder) {
      problems.push(['Cannot upload NSFW to SFW Section', { website: 'FurryLife' }]);
    }
  }

  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  acceptedFiles: ACCEPTED_FILES,
  additionalFiles: true,
  displayedName: 'FurryLife',
  login: {
    url: 'https://furrylife.online/'
  },
  components: {
    submissionForm: FurryLifeSubmissionForm,
    journalForm: GenericJournalSubmissionForm
  },
  validators: {
    submission: validate
  },
  parsers: {
    description: [],
  }
})
export class FurryLife extends BaseWebsiteService implements WebsiteService {
  readonly BASE_URL: string = 'https://furrylife.online';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/user/home`, this.BASE_URL, cookies, null);
    try {
      const body = response.body;
      if (body.includes('Sign Out')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = $(body).find('#elUserLink').text().trim();
        await this.loadAlbums(profileId, cookies,  $(body).find('#cUserLink').children('a')[0].href);
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  private async loadAlbums(profileId: string, cookies: any[], url: string) {
    const { body } = await got.get(`${url}?tab=node_gallery_gallery`, this.BASE_URL, cookies, null);
    const $body = $(body);
    const albumUrls: string[] = [];
    $body.find('a').each(function() {
      if (this.href && this.href.includes('album') && !albumUrls.includes(this.href)) {
        albumUrls.push(this.href);
      }
    });

    const data = await Promise.all<Folder>(
      albumUrls.map(async albumUrl => {
        const res = await got.get(albumUrl, this.BASE_URL, cookies, null);
        const urlParts = albumUrl.split('/');
        urlParts.pop();
        const nsfw = !res.body.includes('1-general-sfw');
        return {
          id: `${urlParts
            .pop()
            .split('-')
            .shift()}-${nsfw ? 'nsfw' : 'sfw'}`,
          nsfw,
          title: res.body.match(/<title>(.*?)<\/title>/)[1].replace('- FurryLife Online', '').trim(),
        };
      }),
    );

    const sfwFolders: Folder = {
      id: 'sfw',
      title: 'SFW',
      subfolders: [
        {
          id: '0-sfw',
          title: 'General (SFW)',
          nsfw: false,
        },
        ...data.filter(d => !d.nsfw).sort((a, b) => a.title.localeCompare(b.title)),
      ],
    };

    const nsfwFolders: Folder = {
      id: 'nsfw',
      title: 'NSFW',
      subfolders: [
        {
          id: '0-nsfw',
          title: 'General (NSFW)',
          nsfw: true,
        },
        ...data.filter(d => d.nsfw).sort((a, b) => a.title.localeCompare(b.title)),
      ],
    };

    this.userInformation.set(profileId, { sfwFolders, nsfwFolders });
  }

  public getFolders(profileId: string): Folder[] {
    const info = this.userInformation.get(profileId);
    return info ? [info.sfwFolders, info.nsfwFolders].filter(f => !!f) : [];
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
    const data = await BrowserWindowHelper.retrieveFormData(
      postData.profileId,
      `${this.BASE_URL}/index.php?app=core&module=status&controller=ajaxcreate`,
      { id: 'elStatusSubmit' }
    );

    const cookies = await getCookies(postData.profileId, this.BASE_URL);

    Object.assign(data, {
      status_content_ajax: postData.description
    });

    const postResponse = await got.post(`${this.BASE_URL}/index.php?app=core&module=status&controller=ajaxcreate`, data, this.BASE_URL, cookies);
    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    if (postResponse.success.response.request.uri.href.includes('profile')) {
      return this.createPostResponse(null);
    }

    return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body));
  }

  private async uploadImage(uploadKey: string, albumParam: string, category: number, cookies: any[], file: any): Promise<any> {
    const data = {
      title: file.options.filename,
      images: file,
      chunk: '0',
      chunks: '1'
    };

    const upload = await got.post(`${this.BASE_URL}/gallery/submit/?_pi=&category=${category}&${albumParam}`, data, this.BASE_URL, cookies, {
      headers: {
        'referer': 'https://furrylife.online',
        'origin': 'https://furrylife.online',
        'x-plupload': uploadKey
      }
    });
    if (upload.error) return Promise.reject(upload.error);

    const { body } = upload.success;
    try {
      const json = JSON.parse(body);
      if (json.id) {
        return json;
      }
    } catch (e) {
      /* Swallow */
    }

    return Promise.reject(upload.success.body);
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const { options } = postData;
    const albumParts = options.folder.split('-');
    const album = albumParts[0];
    const category = albumParts[1].includes('nsfw') ? 2 : 1;

    const files = [postData.primary, ...postData.additionalFiles].filter(f => !!f);

    const albumParam: string = `${album === '0' ? 'noAlbum=1' : 'album=' + album}`;

    const data: any = await BrowserWindowHelper.retrieveFormData(
      postData.profileId,
      `${this.BASE_URL}/gallery/submit/?_pi=&category=${category}&${albumParam}`,
      { id: 'elGallerySubmit' }
    );

    try {
      const cookies = await getCookies(postData.profileId, this.BASE_URL);
      const uploads = await Promise.all(files.map(f => this.uploadImage(data.images, albumParam, category, cookies, fileAsFormDataObject(f))));

      Object.assign(data, {
        upload_images_submitted: '1',
        credit_all: options.credit || '',
        copyright_all: options.copyright || '',
        tags_all: postData.tags.join('\r\n') || '',
        prefix_all: '',
        images_order: uploads.map(u => u.id),
        images_autofollow_all: '0',
      });

      const images_info: any[] = [];
      uploads.forEach(u => {
        images_info.push({ name: `image_title_${u.id}`, value: postData.title });
        images_info.push({ name: `filedata__image_description_${u.id}`, value: postData.description });
        images_info.push({ name: `image_textarea_${u.id}`, value: '' });
        images_info.push({ name: `image_tags_${u.id}_original`, value: '' });
        images_info.push({ name: `image_tags_${u.id}`, value: '' });
        images_info.push({ name: `image_credit_info_${u.id}`, value: '' });
        images_info.push({ name: `image_copyright_${u.id}`, value: '' });
        images_info.push({ name: `image_gps_show_${u.id}`, value: '0' });

        data[`images_existing[o_${u.id}]`] = u.id;
        data[`images_keep[o_${u.id}]`] = '1';
      });

      data.images_info = JSON.stringify(images_info);

      const postResponse = await got.post(`${this.BASE_URL}/gallery/submit/?_pi=&category=${category}&${albumParam}&noWrapper=1`, data, this.BASE_URL, cookies, {
        headers: {
          // 'Content-Type': 'application/x-www-form-urlencoded',
          'referer': 'https://furrylife.online',
          'origin': 'https://furrylife.online',
        },
        // form: data
      });

      if (postResponse.error) {
        return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
      }

      for (let i = 0; i < uploads.length + 1; i++) {
        let url: string = `${this.BASE_URL}/gallery/submit/?_pi=&category=${category}&${albumParam}&totalImages=${uploads.length}&do=saveImages&mr=${i}&csrfKey=${data.csrfKey}`;
        if (i === 0) {
          url += '&_mrReset=1';
        }

        const res = await got.get(url, this.BASE_URL, cookies, null);
      }

      // MAJOR NOTE: I HAVE NO CLUE HOW TO VALIDATE A TRUE SUCCESS WENT THROUGH

      return this.createPostResponse(null);
    } catch (e) {
      return Promise.reject(this.createPostResponse('Unknown error', e));
    }

  }
}
