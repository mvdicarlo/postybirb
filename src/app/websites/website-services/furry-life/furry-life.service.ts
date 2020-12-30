import $ from 'jquery';

import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { SubmissionFormData, Submission } from 'src/app/database/models/submission.model';
import { BaseWebsiteService } from '../base-website-service';
import {
  WebsiteService,
  LoginStatus,
  WebsiteStatus,
  SubmissionPostData,
  PostResult,
} from '../../interfaces/website-service.interface';
import { GenericJournalSubmissionForm } from '../../components/generic-journal-submission-form/generic-journal-submission-form.component';
import { Folder } from '../../interfaces/folder.interface';
import { getTags, supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { FurryLifeSubmissionForm } from './components/furry-life-submission-form/furry-life-submission-form.component';
import { SubmissionRating, SubmissionType } from 'src/app/database/tables/submission.table';
import * as dotProp from 'dot-prop';
import { BrowserWindowHelper } from 'src/app/utils/helpers/browser-window.helper';
import { ISubmissionFileWithArray } from 'src/app/database/tables/submission-file.table';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';

const ACCEPTED_FILES = ['jpeg', 'jpg', 'png', 'gif'];

function validate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const supportedFiles: string[] = ACCEPTED_FILES;

  const tags = getTags(submission, FurryLife.name);
  if (tags.length < 2) problems.push(['Requires minimum tags', { website: 'FurryLife', value: 2 }]);

  if (!supportsFileType(submission.fileInfo, supportedFiles)) {
    problems.push([
      'Does not support file format',
      { website: 'FurryLife', value: submission.fileInfo.type },
    ]);
  }

  if (submission.additionalFileInfo && submission.additionalFileInfo.length) {
    submission.additionalFileInfo
      .filter((info) => !supportsFileType(info, supportedFiles))
      .forEach((info) =>
        problems.push(['Does not support file format', { website: 'FurryLife', value: info.type }])
      );
  }

  if (MBtoBytes(1023) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'FurryLife', value: '1023MB' }]);
  }

  const options = dotProp.get(formData, 'FurryLife.options', { folder: '0-sfw' });
  if (options.folder) {
    const rating = (formData[FurryLife.name] || {}).rating || submission.rating;
    const isNSFW: boolean = rating !== SubmissionRating.GENERAL;
    const isNSFWFolder: boolean = options.folder.endsWith('nsfw');
    if (isNSFW && !isNSFWFolder) {
      problems.push(['Cannot upload NSFW to SFW Section', { website: 'FurryLife' }]);
    }
  }

  return problems;
}

@Injectable({
  providedIn: 'root',
})
@Website({
  acceptedFiles: ACCEPTED_FILES,
  additionalFiles: true,
  displayedName: 'FurryLife',
  login: {
    url: 'https://furrylife.online/',
  },
  components: {
    submissionForm: FurryLifeSubmissionForm,
    journalForm: GenericJournalSubmissionForm,
  },
  validators: {
    submission: validate,
  },
  parsers: {
    description: [],
  },
})
export class FurryLife extends BaseWebsiteService implements WebsiteService {
  readonly BASE_URL: string = 'https://furrylife.online';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT,
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}`, this.BASE_URL, cookies, null);
    try {
      const body = response.body;
      if (!body.includes('Log in')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        const profile = body.match(/members\/(.*?)\.\d+/)[0];
        returnValue.username = profile.split(/(\.|\/)/)[2];
        this.storeUserInformation(profileId, 'profile', profile.split('/')[1]);
        await this.loadAlbums(profileId, cookies);
      }
    } catch (e) {
      /* No important error handling */
    }

    return returnValue;
  }

  private async loadAlbums(profileId: string, cookies: any[]) {
    const { body } = await got.get(
      `${this.BASE_URL}/media/albums/users/${this.userInformation.get(profileId).profile}`,
      this.BASE_URL,
      cookies,
      null
    );
    const $body = $(body);
    const albumUrls: string[] = [];
    $body.find('a').each(function () {
      if (
        this.href &&
        this.href.includes('media/albums') &&
        this.parentElement.className.includes('itemList-item') &&
        !albumUrls.includes(this.href)
      ) {
        albumUrls.push(this.href);
      }
    });

    const data = await Promise.all<Folder>(
      albumUrls.map(async (albumUrl) => {
        albumUrl = `${this.BASE_URL}/media${albumUrl.split('/media')[1]}`;
        const res = await got.get(albumUrl, this.BASE_URL, cookies, null);
        const urlParts = albumUrl.split('/');
        urlParts.pop();
        const nsfw = !res.body.includes('general-sfw-albums.1');
        return {
          id: `${urlParts.pop()}-${nsfw ? 'nsfw' : 'sfw'}`,
          nsfw,
          title: res.body
            .match(/<title>(.*?)<\/title>/)[1]
            .replace('| FurryLife Online', '')
            .trim(),
        };
      })
    );

    const sfwFolders: Folder = {
      id: 'sfw',
      title: 'SFW',
      subfolders: [
        {
          id: 'general-sfw.712-sfw',
          title: 'General (SFW)',
          nsfw: false,
        },
        ...data.filter((d) => !d.nsfw).sort((a, b) => a.title.localeCompare(b.title)),
      ],
    };

    const nsfwFolders: Folder = {
      id: 'nsfw',
      title: 'NSFW',
      subfolders: [
        {
          id: 'explicit-nsfw.714-nsfw',
          title: 'General (NSFW)',
          nsfw: true,
        },
        ...data.filter((d) => d.nsfw).sort((a, b) => a.title.localeCompare(b.title)),
      ],
    };

    this.userInformation.set(profileId, { sfwFolders, nsfwFolders });
  }

  public getFolders(profileId: string): Folder[] {
    const info = this.userInformation.get(profileId);
    return info ? [info.sfwFolders, info.nsfwFolders].filter((f) => !!f) : [];
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

  private async postJournal(
    submission: Submission,
    postData: SubmissionPostData
  ): Promise<PostResult> {
    const data = await BrowserWindowHelper.retrieveFormData(
      postData.profileId,
      `${this.BASE_URL}/index.php?app=core&module=status&controller=ajaxcreate`,
      { id: 'elStatusSubmit' }
    );

    const cookies = await getCookies(postData.profileId, this.BASE_URL);

    Object.assign(data, {
      status_content_ajax: postData.description,
    });

    const postResponse = await got.post(
      `${this.BASE_URL}/index.php?app=core&module=status&controller=ajaxcreate`,
      data,
      this.BASE_URL,
      cookies
    );
    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    if (postResponse.success.response.request.uri.href.includes('profile')) {
      return this.createPostResponse(null);
    }

    return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body));
  }

  private async upload(
    cookies: any[],
    token: string,
    url: string,
    file: ISubmissionFileWithArray
  ): Promise<any> {
    const uploadFile = fileAsFormDataObject(file);
    const data = {
      _xfToken: token,
      _xfResponseType: 'json',
      _xfWithData: '1',
      flowChunkNumber: '1',
      flowChunkSize: '4294967296',
      flowCurrentChunkSize: file.buffer.length,
      flowCTotalSize: file.buffer.length,
      flowIdentifier: `${file.buffer.length}-${file.fileInfo.name.replace('.', '')}`,
      flowFilename: file.fileInfo.name,
      flowRelativePath: file.fileInfo.name,
      flowTotalChunks: '1',
      upload: uploadFile,
    };

    const res = await got.post(url, data, this.BASE_URL, cookies);

    if (res.error) {
      return Promise.reject(this.createPostResponse('Failed to upload file'));
    }

    const json = JSON.parse(res.success.body);
    if (json.status === 'ok') {
      return json.attachment;
    }

    return Promise.reject(this.createPostResponse(Object.values(json.errors).join('\n')));
  }

  private async postSubmission(
    submission: Submission,
    postData: SubmissionPostData
  ): Promise<PostResult> {
    const { options } = postData;
    const albumParts = options.folder.split('-');
    albumParts.pop();
    const album = albumParts.join('-');

    const isNotAlbum =
      options.folder === 'general-sfw.712-sfw' || options.folder === 'explicit-nsfw.714-nsfw';

    await BrowserWindowHelper.hitUrl(
      postData.profileId,
      `${this.BASE_URL}/media/${isNotAlbum ? 'categories' : 'albums'}/${album}/add`
    );

    const files = [postData.primary, ...postData.additionalFiles].filter((f) => !!f);
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const page = await got.get(
      `${this.BASE_URL}/media/${isNotAlbum ? 'categories' : 'albums'}/${album}/add`,
      this.BASE_URL,
      cookies,
      null
    );

    const token = page.body.match(/data-csrf="(.*?)"/)[1];
    const href = `${this.BASE_URL}${
      page.body.match(/href="\/attachments\/upload\?type=(.*?)"/)[0].match(/"(.*?)"/)[1]
    }`.replace(/&amp;/g, '&');
    const hash = HTMLParser.getInputValue(page.body, 'attachment_hash');
    const hashCombined = HTMLParser.getInputValue(page.body, 'attachment_hash_combined').replace(
      /&quot;/g,
      '"'
    );

    const uploads = await Promise.all(files.map((file) => this.upload(cookies, token, href, file)));

    const data: any = {
      attachment_hash: hash,
      attachment_hash_combined: hashCombined,
      _xfToken: token,
      _xfRequestUri: `/media/${isNotAlbum ? 'categories' : 'albums'}/${album}/add`,
      _xfWithData: '1',
      _xfResponseType: 'json',
    };

    if (isNotAlbum) {
      data.category_id = album.split('.').pop();
    } else {
      data.album_id = album.split('.').pop();
    }

    uploads.forEach((u) => {
      const mediaId = `media[${u.temp_media_id}]`;
      data[`${mediaId}[title]`] = postData.title;
      data[`${mediaId}[description]`] = '';
      data[`${mediaId}[tags]`] = this.formatTags(postData.tags).join(', ');
      data[`${mediaId}[temp_media_id]`] = u.temp_media_id;
      data[`${mediaId}[media_hash]`] = u.media_hash;
      data[`${mediaId}[media_type]`] = u.type_grouping;
      data[`${mediaId}[attachment_id]`] = u.attachment_id;
      data[`${mediaId}[custom_fields][caption_html]`] = postData.description;
      data[`${mediaId}[custom_fields][artist]`] = postData.options.credit || '';
      data[`${mediaId}[custom_fields][artist_url]`] = '';
      data[`${mediaId}[custom_fields][characters]`] = '';
    });

    const res = await got.post(`${this.BASE_URL}/media/save-media`, data, this.BASE_URL, cookies);

    if (res.error) {
      return Promise.reject(this.createPostResponse('Unknown issue'));
    }

    const json = JSON.parse(res.success.body);
    if (json.status === 'ok') {
      return this.createPostResponse(null);
    }

    return Promise.reject(Object.values(json.errors).join('\n'));
  }
}
