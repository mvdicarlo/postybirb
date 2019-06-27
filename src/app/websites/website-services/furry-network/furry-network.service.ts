import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { FurryNetworkLoginDialog } from './components/furry-network-login-dialog/furry-network-login-dialog.component';
import { MarkdownParser } from 'src/app/utils/helpers/description-parsers/markdown.parser';
import { BaseWebsiteService } from '../base-website-service';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes, isGIF, fileAsBlob } from 'src/app/utils/helpers/file.helper';
import { TypeOfSubmission, getTypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { HttpClient } from '@angular/common/http';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult, WebsiteService } from '../../interfaces/website-service.interface';
import { FurryNetworkSubmissionForm } from './components/furry-network-submission-form/furry-network-submission-form.component';
import { FurryNetworkJournalForm } from './components/furry-network-journal-form/furry-network-journal-form.component';
import { SubmissionType, SubmissionRating } from 'src/app/database/tables/submission.table';
import { ISubmissionFileWithArray } from 'src/app/database/tables/submission-file.table';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];

  if (!supportsFileType(submission.fileInfo, ['png', 'jpeg', 'jpg', 'mp3', 'mp4', 'webm', 'swf', 'gif', 'wav', 'txt', 'plain'])) {
    problems.push(['Does not support file format', { website: 'Furry Network', value: submission.fileInfo.type }]);
  }

  const type: TypeOfSubmission = getTypeOfSubmission(submission.fileInfo);
  let maxSize: number = 32;
  if (type === TypeOfSubmission.ANIMATION || isGIF(submission.fileInfo)) maxSize = 200;
  if (MBtoBytes(maxSize) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: `Furry Network [${type}]`, value: `${maxSize}MB` }]);
  }

  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  displayedName: 'Furry Network',
  refreshInterval: 60000 * 10,
  refreshBeforePost: true,
  login: {
    dialog: FurryNetworkLoginDialog,
    url: 'https://furrynetwork.com'
  },
  components: {
    submissionForm: FurryNetworkSubmissionForm,
    journalForm: FurryNetworkJournalForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [MarkdownParser.parse],
    usernameShortcut: {
      code: 'fn',
      url: 'https://furrynetwork.com/$1'
    }
  }
})
export class FurryNetwork extends BaseWebsiteService implements WebsiteService {
  readonly BASE_URL: string = 'https://furrynetwork.com';
  private collections: string[] = ['artwork', 'story', 'multimedia'];

  constructor(private http: HttpClient, private _profileManager: LoginProfileManagerService) {
    super();
  }

  public async checkStatus(profileId: string, data?: any): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    if (data) {
      const refresh = await got.post(`${this.BASE_URL}/api/oauth/token`, null, this.BASE_URL, [], {
        form: {
          refresh_token: data.refresh_token,
          client_id: '123',
          grant_type: 'refresh_token'
        }
      });

      if (refresh.success) {
        const body = JSON.parse(refresh.success.body);
        data.access_token = body.access_token;
        this._profileManager.storeData(profileId, FurryNetwork.name, data);
      }

      const response = await got.get(`${this.BASE_URL}/api/user`, this.BASE_URL, [], profileId, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = body.characters[0].name;
        this.userInformation.set(profileId, { info: body });
        const promises = body.characters.map(character => this._loadCollections(profileId, data.access_token, character));
        await Promise.all(promises);
      }

      if (returnValue.status === LoginStatus.LOGGED_OUT) {
        this.unauthorize(profileId);
      }
    }

    return returnValue;
  }

  public async refreshTokens(profileId: string, data?: any): Promise<WebsiteStatus> {
    return await this.checkStatus(profileId, data);
  }

  private async _loadCollections(profileId: string, token: any, character: any): Promise<void> {
    const collections: any = {
      artwork: [],
      story: [],
      multimedia: []
    };

    for (let i = 0; i < this.collections.length; i++) {
      const collection = this.collections[i];
      const response = await got.get(`${this.BASE_URL}/api/character/${character.name}/${collection}/collections`, this.BASE_URL, [], profileId, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(() => console.warn(`No collections for ${character.name}`));
      if (response && response.statusCode === 200) {
        const body = JSON.parse(response.body)
        collections[collection] = body;
      }
    }

    const info = this.userInformation.get(profileId);
    info[character.name] = collections;
  }

  public async authorize(data: { username: string, password: string }, profileId: string): Promise<boolean> {
    const loginData: any = {
      username: data.username,
      password: data.password,
      grant_type: 'password',
      client_id: '123',
      client_secret: ''
    };

    const response = await got.post(`${this.BASE_URL}/api/oauth/token`, loginData, this.BASE_URL, []);

    if (response.error) {
      return false;
    }

    const body = JSON.parse(response.success.body);
    if (response.success.response.statusCode === 200) {
      this._profileManager.storeData(profileId, FurryNetwork.name, body);
      return true;
    }

    return false;
  }

  public unauthorize(profileId: string): void {
    this._profileManager.storeData(profileId, FurryNetwork.name, null);
  }

  public getProfiles(profileId: string): any[] {
    const info = this.userInformation.get(profileId);
    if (info) {
      return info.info.characters;
    }

    return [];
  }

  public getCollections(profileId: string, profileName: string): any {
    const info = this.userInformation.get(profileId);
    if (info) {
      return info[profileName];
    }

    return {};
  }

  private getRating(rating: SubmissionRating): any {
    if (rating === SubmissionRating.GENERAL) return 0;
    else if (rating === SubmissionRating.MATURE) return 1;
    else if (rating === SubmissionRating.ADULT || rating === SubmissionRating.EXTREME) return 2;
    else return 0;
  }

  private getContentType(type: TypeOfSubmission, isGIF: boolean): any {
    if (type === TypeOfSubmission.ART && !isGIF) return 'artwork';
    if (type === TypeOfSubmission.STORY) return 'story';
    if (type === TypeOfSubmission.ANIMATION || type === TypeOfSubmission.AUDIO || isGIF) return 'multimedia'
    return 'artwork';
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
    const authData = this._profileManager.getData(postData.profileId, FurryNetwork.name);

    const data = {
      community_tags_allowed: false,
      collections: [],
      content: postData.description,
      description: postData.description.split('.')[0],
      rating: this.getRating(submission.rating),
      title: postData.title,
      subtitle: '',
      tags: this.formatTags(postData.tags, []),
      status: 'public'
    };

    const postResponse = await got.post(`${this.BASE_URL}/api/journal`, null, this.BASE_URL, [], {
      json: data,
      headers: {
        'Authorization': `Bearer ${authData.access_token}`
      }
    });

    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    if (postResponse.success.body.id) {
      return this.createPostResponse(null);
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body));
    }
  }

  private generateUploadUrl(userProfile: string, file: any, type: any): string {
    let uploadURL = '';

    if (type === 'story') {
      uploadURL = `${this.BASE_URL}/api/story`;
    } else {
      uploadURL = `${this.BASE_URL}/api/submission/${userProfile}/${type}/upload?` +
        'resumableChunkNumber=1' +
        `&resumableChunkSize=${file.size}` + `&resumableCurrentChunkSize=${file.size
        }&resumableTotalSize=${file.size
        }&resumableType=${file.type
        }&resumableIdentifier=${file.size}-${file.name.replace('.', '')
        }&resumableFilename=${file.name
        }&resumableRelativePath=${file.name
        }&resumableTotalChunks=1`;
    }

    return uploadURL;
  }

  private generatePostData(submission: Submission, postData: SubmissionPostData, type: any): object {
    const options = postData.options;
    if (type === 'story') {
      return {
        collections: options.folders || [],
        description: postData.description || postData.title,
        status: options.status,
        title: postData.title,
        tags: this.formatTags(postData.tags, []),
        rating: this.getRating(submission.rating),
        community_tags_allowed: options.communityTags.toString(),
        content: Buffer.from(postData.primary.buffer).toString('utf-8')
      };
    } else {
      return {
        collections: options.folders || [],
        description: postData.description,
        status: options.status,
        title: postData.title,
        tags: this.formatTags(postData.tags, []),
        rating: this.getRating(submission.rating),
        community_tags_allowed: options.communityTags,
        publish: options.notify,
      };
    }
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const authData = this._profileManager.getData(postData.profileId, FurryNetwork.name);
    const options = postData.options;

    const type = this.getContentType(postData.typeOfSubmission, isGIF(postData.primary.fileInfo));

    // Need to check that a correct profile is used
    let profile: string = options.profile ? options.profile : null;
    const existingProfiles = this.getProfiles(postData.profileId) || [];
    if (!existingProfiles.find(p => p.name === profile)) {
      profile = existingProfiles[0].name;
      options.folders = [];
    }

    const uploadURL = this.generateUploadUrl(profile, postData.primary.fileInfo, type);
    const headers = {
      'Authorization': `Bearer ${authData.access_token}`
    };

    // STORY
    if (type === 'story') {
      const postResponse = await got.post(uploadURL, null, this.BASE_URL, [], { headers, json: this.generatePostData(submission, postData, type) });
      if (postResponse.error) {
        return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
      }

      if (postResponse.success.body.id) {
        return this.createPostResponse(null);
      } else {
        return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body));
      }
    } else { // ANYTHING ELSE
      const upload = await this.postChunks(profile, type, postData.primary, headers);
      if (!upload) {
        return Promise.reject(this.createPostResponse('Unable to upload file'));
      }

      const postResponse = await got.patch(`${this.BASE_URL}/api/${type}/${upload.id}`, null, this.BASE_URL, [], { headers, json: this.generatePostData(submission, postData, type) });
      if (postResponse.error) {
        return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
      }

      if (postResponse.success.body.id) {

        if (type === 'multimedia' && postData.thumbnail) {
          const thumbnailURL = `${this.BASE_URL}/api/submission/${profile}/${type}/${upload.id}/thumbnail?` +
            'resumableChunkNumber=1' +
            `&resumableChunkSize=${postData.thumbnail.fileInfo.size}` + `&resumableCurrentChunkSize=${postData.thumbnail.fileInfo.size}
            &resumableTotalSize=${postData.thumbnail.fileInfo.size}
            &resumableType=${postData.thumbnail.fileInfo.type}
            &resumableIdentifier=${postData.thumbnail.fileInfo.size}-${postData.thumbnail.fileInfo.name.replace('.', '')}
            &resumableFilename=${postData.thumbnail.fileInfo.name}&resumableRelativePath=${postData.thumbnail.fileInfo.name}
            &resumableTotalChunks=1`;

          this.http.post(thumbnailURL, fileAsBlob(postData.thumbnail), { headers: headers })
            .subscribe(success => {
              //NOTHING TO DO
            }, err => {
              //NOTHING TO DO
            });
        }

        const res = this.createPostResponse(null);
        res.srcURL = `${this.BASE_URL}/${type}/${postResponse.success.body.id}`;
        return res;
      } else {
        return Promise.reject(this.createPostResponse('Unknown error', postResponse.success.body));
      }
    }
  }

  private chunkArray(myArray: Uint8Array, chunk_size: number): Buffer[] {
    var index = 0;
    var arrayLength = myArray.length;
    var tempArray = [];

    for (index = 0; index < arrayLength; index += chunk_size) {
      let myChunk = myArray.slice(index, index + chunk_size);
      // Do something if you want with the group
      tempArray.push(myChunk);
    }

    return tempArray;
  }

  async postChunks(userProfile: any, type: any, file: ISubmissionFileWithArray, headers: any): Promise<any> {
    const maxChunkSize = 524288;
    const partitions = this.chunkArray(file.buffer, maxChunkSize);
    let fileInfo = null;

    for (let i = 0; i < partitions.length; i++) {
      fileInfo = await this.uploadChunk(headers, userProfile, type, i + 1, partitions.length, file.fileInfo, Buffer.from(partitions[i]), maxChunkSize);
    }

    return fileInfo;
  }

  // Legacy code using http.post
  uploadChunk(headers: any, userProfile: string, type: string, current: number, total: number, file: any, buffer: Buffer, chunkSize: number): Promise<any> {
    const url = `${this.BASE_URL}/api/submission/${userProfile}/${type}/upload?` +
      `resumableChunkNumber=${current}` +
      `&resumableChunkSize=${chunkSize}` + `&resumableCurrentChunkSize=${buffer.length
      }&resumableTotalSize=${file.size
      }&resumableType=${file.type
      }&resumableIdentifier=${file.size}-${file.name.replace('.', '')
      }&resumableFilename=${file.name
      }&resumableRelativePath=${file.name
      }&resumableTotalChunks=${total}`;

    return new Promise((resolve, reject) => {
      this.http.post<any>(url, new Blob([new Uint8Array(buffer.subarray(0, buffer.length))], {}), { headers, responseType: 'json' })
        .subscribe(res => {
          resolve(res);
        }, err => reject(err))
    });
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    return super.formatTags(defaultTags, other, '-').filter(tag => tag.length <= 30 && tag.length >= 3)
      .map(tag => { return tag.replace(/(\(|\)|:|#|;|\]|\[|')/g, '') })
      .filter(tag => tag.length >= 3)
      .slice(0, 30);
  }
}
