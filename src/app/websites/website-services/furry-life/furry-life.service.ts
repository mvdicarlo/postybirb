import $ from 'jquery';

import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { SubmissionFormData, Submission } from 'src/app/database/models/submission.model';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { BaseWebsiteService } from '../base-website-service';
import { WebsiteService, LoginStatus, WebsiteStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { GenericJournalSubmissionForm } from '../../components/generic-journal-submission-form/generic-journal-submission-form.component';
import { Folder } from '../../interfaces/folder.interface';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes } from 'src/app/utils/helpers/file.helper';
import { FurryLifeSubmissionForm } from './components/furry-life-submission-form/furry-life-submission-form.component';
import { SubmissionRating, SubmissionType } from 'src/app/database/tables/submission.table';
import * as dotProp from 'dot-prop';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';

function validate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];

  if (!supportsFileType(submission.fileInfo, ['jpeg', 'jpg', 'png', 'gif'])) {
    problems.push(['Does not support file format', { website: 'FurryLife', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(1023) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'FurryLife', value: '1023MB' }]);
  }

  const options = dotProp.get(formData, 'FurryLife.options', { folder: '0-sfw' });
  if (options.folder) {
    const isNSFW: boolean = submission.rating !== SubmissionRating.GENERAL;
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
  additionalImages: true,
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
        await this.loadAlbums(profileId, cookies, 1);
        await this.loadAlbums(profileId, cookies, 2);
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  private async loadAlbums(profileId: string, cookies: any[], sfwCategory: number): Promise<void> {
    const response = await got.get(`${this.BASE_URL}/gallery/submit/?noWrapper=1&category=${sfwCategory}`, this.BASE_URL, cookies, null);
    const { body } = response;
    const nsfw: boolean = sfwCategory === 2;
    const folder: Folder = {
      id: `0-${nsfw ? 'nsfw' : 'sfw'}`,
      title: nsfw ? 'NSFW' : 'SFW',
      subfolders: [{
        id: `0-${nsfw ? 'nsfw' : 'sfw'}`,
        title: nsfw ? 'General (NSFW)' : 'General (SFW)',
        nsfw
      }],
      nsfw
    };

    const list$ = $(body).find('#elGallerySubmit_albumChooser')[0];
    if (list$) {
      const albums$ = list$.children;
      for (let i = 0; i < albums$.length; i++) {
        const album = albums$[i];
        const f: Folder = {
          id: `${$(album).find('input').val().trim()}-${nsfw ? 'nsfw' : 'sfw'}`,
          title: $(album).find('strong').text().trim()
        }

        folder.subfolders.push(f);
      }
    }

    const info = this.userInformation.get(profileId) || {};
    if (nsfw) {
      info.nsfwFolders = folder;
    } else {
      info.sfwFolders = folder;
    }

    this.userInformation.set(profileId, info);
  }

  public getFolders(profileId: string): Folder[] {
    const info = this.userInformation.get(profileId);
    return info ? [info.sfwFolders, info.nsfwFolders] : [];
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
    const data = await this.getStatusFormData(postData.profileId);
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

  public getStatusFormData(profileId: string): Promise<any> {
    return new Promise((resolve) => {
      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          partition: `persist:${profileId}`
        }
      });
      win.loadURL(`${this.BASE_URL}/index.php?app=core&module=status&controller=ajaxcreate`);
      win.once('ready-to-show', () => {
        if (win.isDestroyed()) {
          resolve({});
          return;
        }

        win.webContents.executeJavaScript(`Array.from(new FormData(document.getElementById('elStatusSubmit'))).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})`).then(function(value) {
          resolve(value);
        })
          .catch(() => {
            resolve({});
          })
          .finally(() => {
            win.destroy();
          });
      });
    });
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const page = await got.get(`${this.BASE_URL}/index.php?app=core&module=status&controller=ajaxcreate`, this.BASE_URL, cookies, null);

    const data: any = {
      csrfKey: HTMLParser.getInputValue(page.body, 'csrfKey'),
      plupload: HTMLParser.getInputValue(page.body, 'plupload'),
      new_status_submitted: '1',
      MAX_FILE_SIZE: '1072693248',
    };

    if (postData.options.feature) data.make_featured = 'on';

    const response = await got.post(`${this.BASE_URL}/controls/journal/`, data, this.BASE_URL, cookies);
    if (response.error) {
      return Promise.reject(this.createPostResponse('Unknown error occurred', response.error));
    } else {
      return this.createPostResponse(null);
    }
  }
}
