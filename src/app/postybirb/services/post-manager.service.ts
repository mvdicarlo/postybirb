import { Injectable, Injector } from '@angular/core';
import { Submission } from 'src/app/database/models/submission.model';
import { WebsiteService, LoginStatus, WebsiteStatus, SubmissionPostData } from 'src/app/websites/interfaces/website-service.interface';
import { WebsiteRegistry, WebsiteRegistryEntry } from 'src/app/websites/registries/website.registry';
import { SubmissionFileDBService } from 'src/app/database/model-services/submission-file.service';
import { getTags, getDescription, getOptions } from 'src/app/websites/helpers/website-validator.helper';
import { ISubmissionFile, SubmissionFileType } from 'src/app/database/tables/submission-file.table';
import { AdInsertParser } from 'src/app/utils/helpers/description-parsers/ad-insert.parser';
import { UsernameParser } from 'src/app/utils/helpers/description-parsers/username.parser';
import { LoginManagerService } from 'src/app/login/services/login-manager.service';
import { getTypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';

@Injectable({
  providedIn: 'root'
})
export class PostManagerService {
  private serviceMap: Map<string, WebsiteService> = new Map();
  private usernameCodes: { code: string, url: string }[] = [];

  constructor(injector: Injector, private _submissionFileDB: SubmissionFileDBService, private _loginManager: LoginManagerService) {
    const registries: WebsiteRegistryEntry = WebsiteRegistry.getRegistered();
    Object.keys(registries).forEach(key => {
      const registry = registries[key];
      this.serviceMap.set(registry.name, injector.get(registry.class));
      if (registry.websiteConfig.parsers.usernameShortcut) {
        this.usernameCodes.push({
          code: registry.websiteConfig.parsers.usernameShortcut.code,
          url: registry.websiteConfig.parsers.usernameShortcut.url
        });
      }
    });
  }

  public post(website: string, submissionToPost: Submission): Promise<any> {
    const loginInformation: WebsiteStatus = this._loginManager.getWebsiteStatus(submissionToPost.formData.loginProfile, website);

    if (loginInformation && loginInformation.status === LoginStatus.LOGGED_IN) {
      return new Promise((resolve, reject) => {
        this._submissionFileDB.getFilesBySubmissionId(submissionToPost.id)
          .then(files => {
            try {
              const postObject: SubmissionPostData = {
                additionalFiles: this._sortFiles(submissionToPost, files.filter(f => f.fileType === SubmissionFileType.ADDITIONAL_FILE)),
                description: this._parseDescription(getDescription(submissionToPost, website), website),
                loginInformation,
                options: getOptions(submissionToPost, website),
                primary: files.filter(f => f.fileType === SubmissionFileType.PRIMARY_FILE)[0],
                profileId: submissionToPost.formData.loginProfile,
                srcURLs: submissionToPost.postStats.sourceURLs,
                tags: getTags(submissionToPost, website),
                thumbnail: files.filter(f => f.fileType === SubmissionFileType.THUMBNAIL_FILE)[0],
                typeOfSubmission: getTypeOfSubmission(files.filter(f => f.fileType === SubmissionFileType.PRIMARY_FILE)[0].fileInfo)
              };

              this.serviceMap.get(website).post(submissionToPost, postObject)
                .then(res => {
                  resolve(res);
                }).catch(err => {
                  reject(err);
                });
            } catch (error) {
              reject({ msg: 'An internal error occurred', error });
            }
          }).catch(error => {
            reject({ msg: 'An internal error occurred', error });
          });
      });
    } else {
      return Promise.reject({ msg: 'Not logged in' });
    }
  }

  private _parseDescription(description: string, website: string): string {
    const parsers: any[] = WebsiteRegistry.getConfigForRegistry(website).websiteConfig.parsers.description || [];
    let parsed = AdInsertParser.parse((description || '').trim(), website);

    this.usernameCodes.forEach(obj => {
      parsed = UsernameParser.parse(parsed, obj.code, obj.url);
    });

    parsers.forEach(parser => {
      parsed = parser(parsed);
    });

    return parsed;
  }

  /**
   * Returns an ordered list of additional files based on user ordering
   */
  private _sortFiles(submission: Submission, files: ISubmissionFile[]): ISubmissionFile[] {
    const orderedFiles: ISubmissionFile[] = files.map(f => undefined); // initialize array size

    if (files && files.length) {
      const map = submission.fileMap.ADDITIONAL || [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        orderedFiles[map.indexOf(file.id)] = file;
      }
    }

    return orderedFiles;
  }
}
