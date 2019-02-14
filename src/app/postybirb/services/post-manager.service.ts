import { Injectable, Injector } from '@angular/core';
import { Submission } from 'src/app/database/models/submission.model';
import { WebsiteService } from 'src/app/websites/interfaces/website-service.interface';
import { WebsiteRegistry, WebsiteRegistryEntry } from 'src/app/websites/registries/website.registry';
import { SubmissionFileDBService } from 'src/app/database/model-services/submission-file.service';
import { getTags, getDescription, getOptions } from 'src/app/websites/helpers/website-validator.helper';
import { ISubmissionFile, SubmissionFileType } from 'src/app/database/tables/submission-file.table';

@Injectable({
  providedIn: 'root'
})
export class PostManagerService {
  private serviceMap: Map<string, WebsiteService> = new Map();

  constructor(injector: Injector, private _submissionFileDB: SubmissionFileDBService) {
    const registries: WebsiteRegistryEntry = WebsiteRegistry.getRegistered();
    Object.keys(registries).forEach(key => {
      const registry = registries[key];
      this.serviceMap.set(registry.name, injector.get(registry.class));
    });
  }

  public post(website: string, submissionToPost: Submission): Promise<any> {
    return new Promise((resolve, reject) => {
      setTimeout(reject, 10000, { msg: 'Test msg', error: 'This was the error!' });


    });
  }

  public async postReal(website: string, submissionToPost: Submission): Promise<any> {
    const files: ISubmissionFile[] = await this._submissionFileDB.getFilesBySubmissionId(submissionToPost.id);
    const obj = {
      tags: getTags(submissionToPost, website),
      description: getDescription(submissionToPost, website), // TODO actually need to parse,
      options: getOptions(submissionToPost, website),
      primary: files.filter(f => f.fileType === SubmissionFileType.PRIMARY_FILE)[0],
      thumbnail: files.filter(f => f.fileType === SubmissionFileType.THUMBNAIL_FILE)[0],
      additional: files.filter(f => f.fileType === SubmissionFileType.ADDITIONAL_FILE),
      srcURLs: submissionToPost.postStats.sourceURLs
    }
  }
}
