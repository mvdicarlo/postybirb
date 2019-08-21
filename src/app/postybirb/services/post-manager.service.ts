import { Injectable, Injector } from '@angular/core';
import { Submission } from 'src/app/database/models/submission.model';
import { WebsiteService, LoginStatus, WebsiteStatus, SubmissionPostData } from 'src/app/websites/interfaces/website-service.interface';
import { WebsiteRegistry, WebsiteRegistryEntry } from 'src/app/websites/registries/website.registry';
import { SubmissionFileDBService } from 'src/app/database/model-services/submission-file.service';
import { getTags, getDescription, getOptions } from 'src/app/websites/helpers/website-validator.helper';
import { ISubmissionFile, SubmissionFileType, ISubmissionFileWithArray } from 'src/app/database/tables/submission-file.table';
import { AdInsertParser } from 'src/app/utils/helpers/description-parsers/ad-insert.parser';
import { UsernameParser } from 'src/app/utils/helpers/description-parsers/username.parser';
import { LoginManagerService } from 'src/app/login/services/login-manager.service';
import { getTypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { SubmissionType } from 'src/app/database/tables/submission.table';
import * as dotProp from 'dot-prop';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { HTMLFormatParser } from 'src/app/utils/helpers/description-parsers/html.parser';
import { copyObject } from 'src/app/utils/helpers/copy.helper';

@Injectable({
  providedIn: 'root'
})
export class PostManagerService {
  private serviceMap: Map<string, WebsiteService> = new Map();
  private usernameCodes: { code: string, url: string }[] = [];
  private refreshBeforePostWebsites: string[] = [];

  constructor(
    injector: Injector,
    private _submissionFileDB: SubmissionFileDBService,
    private _loginManager: LoginManagerService,
    private _profileManager: LoginProfileManagerService,
  ) {
    const registries: WebsiteRegistryEntry = WebsiteRegistry.getRegistered();
    Object.keys(registries).forEach(key => {
      const registry = registries[key];
      this.serviceMap.set(registry.name, injector.get(registry.class));
      if (registry.websiteConfig.refreshBeforePost) {
        this.refreshBeforePostWebsites.push(registry.name);
      }

      if (registry.websiteConfig.parsers.usernameShortcut) {
        this.usernameCodes.push({
          code: registry.websiteConfig.parsers.usernameShortcut.code,
          url: registry.websiteConfig.parsers.usernameShortcut.url
        });
      }
    });
  }

  public async post(website: string, submissionToPost: Submission): Promise<any> {
    try {
      if (this.refreshBeforePostWebsites.includes(website)) {
        const service: WebsiteService = this.serviceMap.get(website);
        let loginStatus: WebsiteStatus = null;
        if (service.refreshTokens) {
          loginStatus = await service.refreshTokens(submissionToPost.formData.loginProfile, this._profileManager.getData(submissionToPost.formData.loginProfile, website));
        } else {
          loginStatus = await service.checkStatus(submissionToPost.formData.loginProfile, this._profileManager.getData(submissionToPost.formData.loginProfile, website));
        }

        this._loginManager.manuallyUpdateStatus(submissionToPost.formData.loginProfile, website, loginStatus);
      }

      const loginInformation: WebsiteStatus = this._loginManager.getWebsiteStatus(submissionToPost.formData.loginProfile, website);
      if (loginInformation && loginInformation.status === LoginStatus.LOGGED_IN) {
        const f = await this._submissionFileDB.getFilesBySubmissionId(submissionToPost.id);
        const files = await this._convertFilesToArrayType(f);

        const postObject: SubmissionPostData = {
          title: submissionToPost.title || 'New Submission',
          additionalFiles: this._sortFiles(submissionToPost, files.filter(f => f.fileType === SubmissionFileType.ADDITIONAL_FILE)),
          description: this._parseDescription(getDescription(submissionToPost, website), website),
          loginInformation,
          options: copyObject(getOptions(submissionToPost, website)),
          primary: files.filter(f => f.fileType === SubmissionFileType.PRIMARY_FILE)[0],
          profileId: submissionToPost.formData.loginProfile,
          srcURLs: submissionToPost.postStats.sourceURLs,
          tags: getTags(submissionToPost, website),
          thumbnail: files.filter(f => f.fileType === SubmissionFileType.THUMBNAIL_FILE)[0],
          typeOfSubmission: submissionToPost.submissionType === SubmissionType.SUBMISSION ? getTypeOfSubmission(files.filter(f => f.fileType === SubmissionFileType.PRIMARY_FILE)[0].fileInfo) : null
        };

        // Filter thumbnails on specified excluded websites
        const excludedThubmanails: string[] = submissionToPost.formData.excludeThumbnailWebsites || [];
        if (excludedThubmanails.length && excludedThubmanails.includes(website)) {
          postObject.thumbnail = undefined;
        }

        // Too lazy to use injection solution. If you want to just fake a post uncomment this and comment out the post code below
        // try {
        //   return await this._fakePost();
        // } catch (e) {
        //   return Promise.reject(e);
        // }

        try {
          const post = await this.serviceMap.get(website).post(submissionToPost, postObject);
          return post;
        } catch (err) {
          return Promise.reject(err);
        }

      } else {
        return Promise.reject({ msg: 'Not logged in', error: 'Not logged in' });
      }
    } catch (error) {
      return Promise.reject({ msg: 'An internal error occurred', error });
    }
  }

  private _fakePost(): Promise<any> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          let rand = Math.floor(Math.random() * 100);
          if (rand >= 50) {
            resolve({});
          } else {
            reject({ msg: 'Fail', error: 'Me gusta bailar' });
          }
        } catch (err) {
          reject(err);
        }
      }, Math.floor(Math.random() * 7000));
    });
  }

  private _parseDescription(description: string, website: string): string {
    const config = WebsiteRegistry.getConfigForRegistry(website).websiteConfig
    const preparsers: any[] = dotProp.get(config, 'preparsers.description', []);
    const parsers: any[] = dotProp.get(config, 'parsers.description', []);
    let parsed = HTMLFormatParser.parse(description || '');

    preparsers.forEach(parser => {
      parsed = parser(parsed);
    });

    this.usernameCodes.forEach(obj => {
      parsed = UsernameParser.parse(parsed, obj.code, obj.url);
    });

    parsers.forEach(parser => {
      parsed = parser(parsed);
    });

    parsed = AdInsertParser.parse((parsed || '').trim(), website);

    return parsed;
  }

  /**
   * Returns an ordered list of additional files based on user ordering
   */
  private _sortFiles(submission: Submission, files: ISubmissionFileWithArray[]): ISubmissionFileWithArray[] {
    const orderedFiles: ISubmissionFileWithArray[] = files.map(f => undefined); // initialize array size

    if (files && files.length) {
      const map = submission.fileMap.ADDITIONAL || [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        orderedFiles[map.indexOf(file.id)] = file;
      }
    }

    return orderedFiles;
  }

  private async _convertFilesToArrayType(files: ISubmissionFile[]): Promise<ISubmissionFileWithArray[]> {
    const modifiedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const modified: any = files[i];
      modified.buffer = new Uint8Array(await new Response(modified.buffer).arrayBuffer());
      modifiedFiles.push(modified);
    }

    return modifiedFiles;
  }
}
