import $ from 'jquery';

import { Injectable } from '@angular/core';
import { BaseWebsiteService } from '../base-website-service';
import { Website } from '../../decorators/website-decorator';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { SubmissionRating, SubmissionType } from 'src/app/database/tables/submission.table';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import {
  LoginStatus,
  WebsiteStatus,
  SubmissionPostData,
  PostResult,
} from '../../interfaces/website-service.interface';
import { KoFiSubmissionForm } from './components/ko-fi-submission-form/ko-fi-submission-form.component';
import { fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import { Folder } from '../../interfaces/folder.interface';

const ACCEPTED_FILES = ['jpeg', 'jpg', 'png'];

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const rating = (formData[KoFi.name] || {}).rating || submission.rating;
  if (rating && rating !== SubmissionRating.GENERAL) {
    problems.push(['Does not support rating', { website: 'Ko-fi', value: rating }]);
  }

  if (!supportsFileType(submission.fileInfo, ACCEPTED_FILES)) {
    problems.push([
      'Does not support file format',
      { website: 'Ko-fi', value: submission.fileInfo.type },
    ]);
  }

  return problems;
}

@Injectable({
  providedIn: 'root',
})
@Website({
  acceptedFiles: ACCEPTED_FILES,
  displayedName: 'Ko-fi',
  login: {
    url: 'https://ko-fi.com/account/login',
  },
  components: {
    submissionForm: KoFiSubmissionForm,
    journalForm: KoFiSubmissionForm,
  },
  validators: {
    submission: submissionValidate,
  },
  parsers: {
    description: [],
  },
})
export class KoFi extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://ko-fi.com';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT,
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/settings`, this.BASE_URL, cookies, undefined);
    try {
      if (!response.body.includes('btn-login')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = HTMLParser.getInputValue(response.body, 'DisplayName');
        this.userInformation.set(profileId, {
          id: response.body.match(/pageId:\s'(.*?)'/)[1],
        });

        await this.loadAlbums(profileId, cookies, response.body.match(/buttonId:\s'(.*?)'/)[1]);
      }
    } catch (e) {
      /* No important error handling */
    }

    return returnValue;
  }

  private async loadAlbums(profileId: string, cookies: any[], id: string): Promise<void> {
    const response = await got.get(
      `${this.BASE_URL}/${id}/gallery`,
      this.BASE_URL,
      cookies,
      undefined
    );
    const albums: Folder[] = [
      {
        title: 'No album',
        id: '',
      },
    ];

    $(response.body)
      .find('.hz-album-each')
      .each(function () {
        const title = this.innerText.trim();
        if (title !== 'New') {
          albums.push({
            title,
            id: this.firstElementChild.href.split('/').pop(),
          });
        }
      });

    this.storeUserInformation(profileId, 'folders', albums);
  }

  public getFolders(profileId: string): Folder[] {
    const info = this.userInformation.get(profileId);
    return info.folders || [];
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
    const cookies = await getCookies(postData.profileId, this.BASE_URL);

    const data = {
      type: '',
      blogPostId: '',
      blogPostTitle: postData.title,
      postBody: postData.description,
      featuredImage: '',
      noFeaturedImage: 'false',
      showFeaturedImageOnPost: 'true',
      embedUrl: '',
      tags: this.formatTags(postData.tags, []).join(','),
      postAudience: postData.options.audience || 'public',
    };

    const postResponse = await got.post(
      `${this.BASE_URL}/Blog/AddBlogPost`,
      data,
      this.BASE_URL,
      cookies,
      {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;',
          Pragma: 'no-cache',
          'Cache-Control': 'no-cache',
          Referer: 'https://ko-fi.com/',
          Connection: 'keep-alive',
        },
      }
    );
    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    const postUrl = (postResponse.success.body.match(/\/Blog\/PublishPost\/\d+/) || [])[0];
    if (!postUrl) {
      return Promise.reject(
        this.createPostResponse('Unable to detect a posting Url', postResponse.success.body)
      );
    }

    const publish = await got.post(`${this.BASE_URL}${postUrl}`, null, this.BASE_URL, cookies, {
      gzip: true,
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        Accept: '*/*',
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
        Referer: 'https://ko-fi.com/',
        Connection: 'keep-alive',
      },
    });
    if (publish.error) {
      return Promise.reject(this.createPostResponse('Unknown error', publish.error));
    }

    if (publish.success.response.statusCode === 200) {
      return this.createPostResponse(null);
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', publish.success.body));
    }
  }

  private async postSubmission(
    submission: Submission,
    postData: SubmissionPostData
  ): Promise<PostResult> {
    const cookies = await getCookies(postData.profileId, this.BASE_URL);

    const uploadData: any = {
      uniqueFilename: '',
      file: fileAsFormDataObject(postData.primary),
    };

    const upload = await got.post(
      `${this.BASE_URL}/api/media/gallery-item/upload`,
      uploadData,
      this.BASE_URL,
      cookies,
      {
        headers: {
          Referer: 'https://ko-fi.com/',
        },
      }
    );

    if (upload.error) {
      return Promise.reject(this.createPostResponse('Unknown error', upload.error));
    }

    let body = null;
    try {
      body = JSON.parse(upload.success.body);
    } catch (err) {
      return Promise.reject(
        this.createPostResponse('Unknown error', `JSON PARSE FAILURE\n${upload.success.body}`)
      );
    }

    const info = this.userInformation.get(postData.profileId);

    const data: any = {
      Album: postData.options.folder || '',
      Audience: postData.options.audience,
      Title: postData.title,
      Description: PlaintextParser.parse(
        postData.description.replace(
          '<p><a href="http://www.postybirb.com">Posted using PostyBirb</a></p>',
          '\n\nPosted using PostyBirb'
        )
      ),
      PostToTwitter: 'false',
      EnableHiRes: postData.options.hiRes ? 'true' : 'false',
      ImageUploadIds: [body[0].ExternalId],
    };

    const postResponse = await got.post(
      `${this.BASE_URL}/Feed/AddImageFeedItem`,
      data,
      this.BASE_URL,
      cookies,
      {
        gzip: true,
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
          Accept: 'text/html, */*',
          Referer: 'https://ko-fi.com/',
        },
      }
    );

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    if (postResponse.success.response.statusCode === 200) {
      return this.createPostResponse(null);
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body));
    }
  }
}
