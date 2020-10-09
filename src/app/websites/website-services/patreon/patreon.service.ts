import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { BaseWebsiteService } from '../base-website-service';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes, fileAsBlob, isImage } from 'src/app/utils/helpers/file.helper';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { PatreonSubmissionForm } from './components/patreon-submission-form/patreon-submission-form.component';
import { SubmissionType } from 'src/app/database/tables/submission.table';
import { TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { ISubmissionFileWithArray } from 'src/app/database/tables/submission-file.table';
import { BrowserWindowHelper } from 'src/app/utils/helpers/browser-window.helper';
import { Folder } from '../../interfaces/folder.interface';
import * as dotProp from 'dot-prop';

const ACCEPTED_FILES = ['png', 'jpeg', 'jpg', 'gif', 'midi', 'ogg', 'oga', 'wav', 'x-wav', 'webm', 'mp3', 'mpeg', 'pdf', 'txt', 'rtf', 'md'];

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const supportedFiles: string[] = ACCEPTED_FILES;

  if (submission.submissionType === SubmissionType.SUBMISSION) {
    if (!supportsFileType(submission.fileInfo, supportedFiles)) {
      problems.push(['Does not support file format', { website: 'Patreon', value: submission.fileInfo.type }]);
    }

    if (submission.additionalFileInfo && submission.additionalFileInfo.length) {
      submission.additionalFileInfo
        .filter(info => !supportsFileType(info, supportedFiles))
        .forEach(info => problems.push(['Does not support file format', { website: 'Patreon', value: info.type }]));
    }

    if (MBtoBytes(200) < submission.fileInfo.size) {
      problems.push(['Max file size', { website: 'Patreon', value: '200MB' }]);
    }
  }

  return problems;
}

function descriptionParse(html: string): string {
  if (!html) return '';
  // encode html
  html = html.replace(/[\u00A0-\u9999<>&](?!#)/gim, (i) => {
    return '&#' + i.charCodeAt(0) + ';';
  });

  // decode html
  // this converts html tags back, but not entities which could cause patreon to break
  html = html.replace(/&#([0-9]{1,3});/gi, (match, num) => {
    return String.fromCharCode(parseInt(num));
  });

  return html
    .replace(/\n/g, '')
    .replace(/<p/gm, '<div')
    .replace(/<\/p>/gm, '</div>')
    .replace(/(<s>|<\/s>)/g, '')
    .replace(/<hr\s{0,1}\/{0,1}>/g, '<br>');
}

@Injectable({
  providedIn: 'root'
})
@Website({
  acceptedFiles: ACCEPTED_FILES,
  additionalFiles: true,
  login: {
    url: 'https://www.patreon.com/login'
  },
  components: {
    submissionForm: PatreonSubmissionForm,
    journalForm: PatreonSubmissionForm
  },
  validators: {
    submission: submissionValidate,
    journal: submissionValidate
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
    try {
      const body: string = await BrowserWindowHelper.runScript<string>(profileId, `${this.BASE_URL}/creator-home`, 'document.body.parentElement.innerHTML')
      const user = body.match(/"full_name": "(.*?)"/);
      if (user && user[1]) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = user[1];
        await this.loadTiers(profileId, cookies);
      }
    } catch (e) {
      console.log(e);
    }

    return returnValue;
  }

  private attemptAccessTiers(profileId: string, id: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          partition: `persist:${profileId}`
        }
      });

      win.loadURL(`${this.BASE_URL}/api/posts/${id}?include=access_rules.tier.null,attachments.null,campaign.access_rules.tier.null,campaign.earnings_visibility,campaign.is_nsfw,images.null,audio.null&fields[access_rule]=access_rule_type`);

      win.once('ready-to-show', function() {
        if (win.isDestroyed()) {
          resolve('');
          return;
        }

        win.webContents.executeJavaScript('document.body.innerText')
          .then(result => resolve(result))
          .catch(err => reject(err))
          .finally(() => win.destroy());
      });
    });
  }

  private async loadTiers(profileId: string, cookies: any[]): Promise<any> {
    const csrf = await this._getCSRF(cookies, profileId);
    const createData = {
      data: {
        type: 'post',
        attributes: {
          post_type: 'image_file'
        }
      }
    };

    const create = await ehttp.browserPost(`${this.BASE_URL}/api/posts?fields[post]=post_type%2Cpost_metadata&json-api-version=1.0&include=[]`,
      profileId,
      {
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Content-Type': 'application/vnd.api+json',
        'Origin': 'https://www.patreon.com',
        'Pragma': 'no-cache',
        'Referer': 'https://www.patreon.com/posts/new',
        'X-CSRF-Signature': csrf,
      },
      createData
    );

    const response: any = JSON.parse(create);
    const id = response.data.id;
    let body: any = {};
    try {
      body = JSON.parse(await this.attemptAccessTiers(profileId, id));
    } catch (e) {
      try {
        const patreonTiers = await ehttp.get(`${this.BASE_URL}/api/posts/${id}?include=access_rules.tier.null,attachments.null,campaign.access_rules.tier.null,campaign.earnings_visibility,campaign.is_nsfw,images.null,audio.null&fields[access_rule]=access_rule_type`,
          profileId,
          {
            cookies,
            headers: {
              'Origin': 'https://www.patreon.com',
            }
          });
        const parsedBody: string = patreonTiers.body.replace(/(,:|:,)/gm, ':');
        body = JSON.parse(parsedBody);
      } catch (e) {
        // NOTE: fallback for some users since patreon returns weird json sometimes
        const fallback = await ehttp.get(`${this.BASE_URL}/api/posts/${id}?include=access_rules.tier.null,attachments.null,campaign.access_rules.tier.null,campaign.earnings_visibility,campaign.is_nsfw,images.null,audio.null&fields[access_rule]=access_rule_type`,
          profileId,
          {
            cookies,
            headers: {
              'Origin': 'https://www.patreon.com',
            }
          });
        const parsedBody: string = fallback.body.replace(/(,:|:,)/gm, ':');
        body = JSON.parse(parsedBody);
      }
    }

    if (body) {
      if (body.included) {
        const customTiers: Folder = {
          title: 'Tiers',
          subfolders: []
        };
        const tiers: Folder[] = [];
        body.included
          .filter(t => t.type === 'access-rule' || t.type === 'reward')
          .filter(t => {
            if (t.attributes.access_rule_type === 'public' || t.attributes.access_rule_type === 'patrons') return true;
            else if (t.attributes.title) return true;
            return false;
          })
          .forEach(t => {
            let id = t.id;
            if (t.type === 'reward') {
              const found = body.included.find(relation => {
                if (relation.attributes.access_rule_type === 'tier') {
                  const relationship = dotProp.get(relation, 'relationships.tier.data.id', null);
                  if (id === relationship) return true;
                }
              });

              if (found) {
                id = found.id;
              }
            }
            const tierObj: Folder = {
              id,
              title: t.attributes.title || t.attributes.access_rule_type
            };
            if (t.type === 'access-rule') {
              if (tierObj.title === 'patrons') tierObj.title = 'Patrons Only';
              else if (tierObj.title === 'public') tierObj.title = 'Public';
              tiers.push(tierObj);
            } else {
              customTiers.subfolders.push(tierObj);
            }
          });

        tiers.push(customTiers);
        this.userInformation.set(profileId, { folders: tiers });
      }
    }
  }

  public getFolders(profileId: string): Folder[] {
    const info = this.userInformation.get(profileId);
    if (info) return info.folders || [];
    return [];
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

  private async _getCSRF(cookies: any[], profileId: string): Promise<string> {
    const body = await BrowserWindowHelper.runScript<string>(profileId, `${this.BASE_URL}/post`, 'document.body.parentElement.innerHTML');
    return body.match(/csrfSignature = "(.*?)"/)[1];
  }

  private async postJournal(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    let cookies = await getCookies(postData.profileId, this.BASE_URL);
    const csrf = await this._getCSRF(cookies, postData.profileId);

    const createData = {
      data: {
        type: 'post',
        attributes: {
          post_type: 'text_only'
        }
      }
    };

    const create = await this._startPost(postData.profileId, csrf, createData);
    if (!create.body || !create.body.includes('self')) {
      return Promise.reject(this.createPostResponse('Unknown error', create.body));
    }

    const response: any = JSON.parse(create.body);
    const link = response.data.id;

    const formattedTags = this.formatTags(postData.tags, []);
    const relationshipTags = formattedTags.map(tag => {
      return {
        id: tag.id,
        type: tag.type
      }
    });

    const options = postData.options;

    const accessRules: any[] = options.tiers.map(tier => {
      return { type: 'access-rule', id: tier };
    });

    const attributes: any = {
      content: postData.description,
      post_type: 'text_only',
      is_paid: options.chargePatrons ? 'true' : 'false',
      title: postData.title,
      teaser_text: '',
      post_metadata: {},
      tags: { publish: true },
    };

    if (options.earlyAccess) {
      attributes.change_visibility_at = this.toUTCISO(options.earlyAccess);
    }

    if (options.schedule) {
      attributes.scheduled_for = this.toUTCISO(options.schedule);
      attributes.tags.publish = false;
    }

    const relationships = {
      post_tag: {
        data: relationshipTags.length > 0 ? relationshipTags[0] : {}
      },
      user_defined_tags: {
        data: relationshipTags
      },
      access_rule: {
        data: accessRules[accessRules.length - 1]
      },
      access_rules: {
        data: accessRules
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

    accessRules.forEach(rule => data.included.push(rule));

    const postResponse = await this._uploadFinalStep(postData.profileId, link, csrf, data);
    let json;
    try {
      json = JSON.parse(postResponse.body);
    } catch (e) { };

    if (json && !json.errors) {
      return this.createPostResponse(null);
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', `Post failed on final step\n${postResponse.body}`));
    }
  }

  private _getPostType(type: TypeOfSubmission, alt: boolean = false): any {
    if (alt) {
      if (type === TypeOfSubmission.ART) return 'image_file';
      if (type === TypeOfSubmission.AUDIO) return 'audio_embed';
      if (type === TypeOfSubmission.STORY) return 'text_only';
    } else {
      if (type === TypeOfSubmission.ART) return 'image_file';
      if (type === TypeOfSubmission.AUDIO) return 'audio_file';
      if (type === TypeOfSubmission.STORY) return 'text_only';
    }

    return 'image_file';
  }

  private _startPost(profileId: string, csrf: string, data: any): Promise<any> {
    const cmd = `
    var data = ${JSON.stringify(data)};
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/posts?fields[post]=post_type%2Cpost_metadata&json-api-version=1.0&include=[]', false);
    xhr.setRequestHeader('X-CSRF-Signature', '${csrf}');
    xhr.setRequestHeader("Content-Type", "application/vnd.api+json");
    xhr.send(JSON.stringify(data));
    var body = xhr.response;
    Object.assign({}, { body: body, status: xhr.status })`;
    return BrowserWindowHelper.runScript(profileId, `https://www.patreon.com/posts/new`, cmd);
  }

  private _uploadFile(id: string, file: ISubmissionFileWithArray, csrf: string, partitionId: string, relationship?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const data: any = {
        data: {
          attributes: {
            state: 'pending_upload',
            owner_id: id,
            owner_type: 'post',
            owner_relationship: relationship || 'main',
            file_name: file.fileInfo.name
          },
          type: 'media'
        }
      };

      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          partition: `persist:${partitionId}`
        }
      });

      win.loadURL(`${this.BASE_URL}/posts/${id}/edit`);

      win.once('ready-to-show', function() {
        if (win.isDestroyed()) {
          reject(new Error(`Browser Window for patreon post was already destroyed.`));
          return;
        }

        const arr: any = new Uint8Array(file.buffer);
        const cmd = `
        const data = '${JSON.stringify(data)}';
        var h = new XMLHttpRequest();
        h.open('POST', '/api/media?json-api-version=1.0', false);
        h.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        h.setRequestHeader("X-CSRF-Signature", "${csrf}");
        h.send(data);
        var body = JSON.parse(h.response);
        var x = body.data.attributes.upload_parameters;
        var dest = body.data.attributes.upload_url;
        var fd = new FormData();
        var file = new File([new Blob([new Uint8Array([${arr}])], { type: '${file.fileInfo.type}' })], '${file.fileInfo.name}', { type: '${file.fileInfo.type}' });
        Object.entries(x).forEach(([key, value]) => fd.append(key, value));
        fd.append('file', file);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', dest, false);
        xhr.send(fd);
        Object.assign({}, { body: body, status: xhr.status })`;
        win.webContents.executeJavaScript(cmd)
          .then(result => {
            if (result && result.body && result.status && result.status < 320) {
              resolve(result);
            } else {
              reject(result);
            }
          })
          .catch(err => reject(err))
          .finally(() => win.destroy());
      });
    });
  }

  private _uploadFinalStep(profileId: string, id: string, csrf: string, data: any): Promise<any> {
    const cmd = `
    var data = ${JSON.stringify(data)};
    var xhr = new XMLHttpRequest();
    xhr.open('PATCH', '/api/posts/${id}?json-api-version=1.0', false);
    xhr.setRequestHeader('X-CSRF-Signature', '${csrf}');
    xhr.setRequestHeader("Content-Type", "application/vnd.api+json");
    xhr.send(JSON.stringify(data));
    var body = xhr.response;
    Object.assign({}, { body: body, status: xhr.status })`;
    return BrowserWindowHelper.runScript(profileId, `${this.BASE_URL}/posts/${id}/edit`, cmd);
  }

  private _uploadAttachment(id: string, file: ISubmissionFileWithArray, csrf: string, partitionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const uuid = URL.createObjectURL(fileAsBlob(file));

      const data: any = {
        qquuid: uuid,
        qqfilename: file.fileInfo.name,
        qqtotalfilesize: file.fileInfo.size,
      };

      URL.revokeObjectURL(uuid);

      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          partition: `persist:${partitionId}`
        }
      });

      win.loadURL(`${this.BASE_URL}/posts/${id}/edit`);

      win.once('ready-to-show', function() {
        if (win.isDestroyed()) {
          reject(new Error(`Browser Window for patreon post was already destroyed.`));
          return;
        }

        const arr: any = new Uint8Array(file.buffer);
        const cmd = `
        const data = '${JSON.stringify(data)}';
        var fd = new FormData();
        var file = new File([new Blob([new Uint8Array([${arr}])], { type: '${file.fileInfo.type}' })], '${file.fileInfo.name}', { type: '${file.fileInfo.type}' });
        Object.entries(data).forEach(([key, value]) => fd.append(key, value));
        fd.append('file', file);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/posts/${id}/attachments?json-api-version=1.0', false);
        xhr.setRequestHeader("X-CSRF-Signature", "${csrf}");
        xhr.send(fd);
        xhr.status`;
        win.webContents.executeJavaScript(cmd)
          .then((result) => {
            if (result && result < 320) {
              resolve(result);
            } else {
              reject(result);
            }
          })
          .catch(err => reject(err))
          .finally(() => win.destroy());
      });
    });
  }

  private toUTCISO(date: Date | string): string {
    let d: Date = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('.').shift();
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    let cookies = await getCookies(postData.profileId, this.BASE_URL);
    const csrf = await this._getCSRF(cookies, postData.profileId);

    const createData = {
      data: {
        type: 'post',
        attributes: {
          post_type: this._getPostType(postData.typeOfSubmission, true)
        }
      }
    };

    postData.primary.fileInfo.name = postData.primary.fileInfo.name.replace(/'/g, '');
    if (postData.thumbnail) postData.thumbnail.fileInfo.name = postData.primary.fileInfo.name.replace(/'/g, '');
    postData.additionalFiles.forEach(f => f.fileInfo.name = f.fileInfo.name.replace(/'/g, ''));

    const create = await this._startPost(postData.profileId, csrf, createData);
    if (!create.body || !create.body.includes('self')) {
      return Promise.reject(this.createPostResponse('Unknown error', create.body));
    }

    const response: any = JSON.parse(create.body);
    const link = response.data.id;

    let uploadType = 'main';
    let shouldUploadThumbnail: boolean = false;
    if (postData.typeOfSubmission === TypeOfSubmission.AUDIO) {
      uploadType = 'audio';
      shouldUploadThumbnail = postData.thumbnail ? true : false;
    }

    let primaryFileUpload;
    let thumbnailFileUpload;
    let additionalUploads = [];
    let additionalImageUploads = [];
    try {
      if (postData.typeOfSubmission === TypeOfSubmission.STORY) {
        const upload = await this._uploadAttachment(link, postData.primary, csrf, postData.profileId);
        additionalUploads.push(upload);
      } else {
        primaryFileUpload = await this._uploadFile(link, postData.primary, csrf, postData.profileId, uploadType);
        if (shouldUploadThumbnail) {
          thumbnailFileUpload = await this._uploadFile(link, postData.thumbnail, csrf, postData.profileId, 'main');
        }
      }

      if (postData.additionalFiles && postData.additionalFiles.length) {
        for (let i = 0; i < postData.additionalFiles.length; i++) {
          const file = postData.additionalFiles[i];
          if (postData.typeOfSubmission === TypeOfSubmission.ART && isImage(file.fileInfo)) {
            const upload = await this._uploadFile(link, file, csrf, postData.profileId, uploadType);
            additionalImageUploads.push(upload);
          } else {
            const upload = await this._uploadAttachment(link, file, csrf, postData.profileId);
            additionalUploads.push(upload);
          }
        }
      }
    } catch (err) {
      return Promise.reject(this.createPostResponse('Failure to upload file', err));
    }

    const options = postData.options;

    const formattedTags = this.formatTags(postData.tags, []);
    const relationshipTags = formattedTags.map(tag => {
      return {
        id: tag.id,
        type: tag.type
      }
    });

    const accessRules: any[] = options.tiers.map(tier => {
      return { type: 'access-rule', id: tier };
    });

    const attributes: any = {
      content: postData.description,
      post_type: this._getPostType(postData.typeOfSubmission),
      is_paid: options.chargePatrons ? true : false,
      title: postData.title,
      teaser_text: null,
      post_metadata: {},
      tags: { publish: true },
    };

    if (options.earlyAccess) {
      attributes.change_visibility_at = this.toUTCISO(options.earlyAccess);
    }

    if (options.schedule) {
      attributes.scheduled_for = this.toUTCISO(options.schedule);
      attributes.tags.publish = false;
    }

    const relationships = {
      post_tag: {
        data: relationshipTags.length > 0 ? relationshipTags[0] : {}
      },
      user_defined_tags: {
        data: relationshipTags
      },
      access_rule: {
        data: accessRules[accessRules.length - 1]
      },
      access_rules: {
        data: accessRules
      }
    };

    let image_order = [];
    if (postData.typeOfSubmission === TypeOfSubmission.AUDIO || postData.typeOfSubmission === TypeOfSubmission.ART) {
      image_order = [thumbnailFileUpload ? thumbnailFileUpload.body.data.id : primaryFileUpload.body.data.id, ...additionalImageUploads.map(img => img.body.data.id)];
    }
    const data: any = {
      data: {
        attributes,
        relationships,
        type: 'post'
      },
      included: formattedTags,
      meta: {
        image_order
      }
    };

    if (image_order.length) {
      attributes.post_metadata.image_order = image_order;
    }

    accessRules.forEach(rule => data.included.push(rule));

    const postResponse = await this._uploadFinalStep(postData.profileId, link, csrf, data);
    let json;
    try {
      json = JSON.parse(postResponse.body);
    } catch (e) { };

    if (json && !json.errors) {
      const res = this.createPostResponse(null);
      try {
        res.srcURL = `${this.BASE_URL}/posts/${link}`;
      } catch (e) { /* Don't really care if this fails */ }
      return res;
    } else {
      return Promise.reject(this.createPostResponse('Unknown error', `Failed on final step\n${postResponse.body}`));
    }
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const tags = [...defaultTags, ...other].filter(tag => tag.length <= 25);
    return tags.map(tag => {
      return {
        type: 'post_tag',
        id: `user_defined;${tag}`,
        attributes: {
          value: tag,
          cardinality: 1
        }
      };
    })
      .slice(0, 50);
  }
}
