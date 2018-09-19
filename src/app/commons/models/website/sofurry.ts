import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { HTMLParser } from '../../helpers/html-parser';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { Observable } from 'rxjs';

@Injectable()
export class SoFurry extends BaseWebsite implements Website {

  constructor(private http: HttpClient) {
    super(SupportedWebsites.SoFurry, 'https://www.sofurry.com');
    this.mapping = {
      rating: {
        General: 0,
        Mature: 1,
        Explicit: 1,
        Extreme: 2,
      },
      content: {
        Artwork: 1,
        Story: 0,
        Music: 2,
        Animation: 1,
        Photo: 4,
      },
    };
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(`${this.baseURL}/upload/details?contentType=1`, { responseType: 'text' })
        .subscribe(page => {
          if (page.includes('Logout')) {
            this.loginStatus = WebsiteStatus.Logged_In;

            try {
              const folderPairs = [];
              const folders = page.match(/<select(.|\s)*?(?=\/select)/)[0] + '/select>' || '';
              const element = $.parseHTML(folders);
              let options = $(element).find('option') || [];

              for (let i = 0; i < options.length; i++) {
                const opt = options[i];

                folderPairs.push({
                  value: opt.value,
                  name: opt.text
                });
              }
              this.info.folders = folderPairs;
            } catch (e) {
              console.warn(e);
            }
          } else {
            this.loginStatus = WebsiteStatus.Logged_Out;
          }

          resolve(this.loginStatus);
        }, err => {
          this.loginStatus = WebsiteStatus.Offline;
          resolve(WebsiteStatus.Offline);
        });
    });
  }

  getUser(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http.get(this.baseURL, { responseType: 'text' })
        .subscribe(page => {
          try {
            let username = null;
            const aTags = HTMLParser.getTagsOf(page, 'a');
            for (let i = 0; i < aTags.length; i++) {
              const tag: string = aTags[i];
              const match = tag.match('avatar');
              if (match) {
                username = tag.match(/:\/\/.*?(\.)/g)[0].replace(/(:|\.|\/)/g, '');
                break;
              }
            }

            username ? resolve(username) : reject(null);
          } catch (e) {
            reject(Error(`Not logged in to ${this.websiteName}`));
          }
        }, err => reject(Error(`Unable to access ${this.websiteName}`)));
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    const contentType = this.getMapping('content', submission.submissionData.submissionType);
    const uploadURL = `${this.baseURL}/upload/details?contentType=${contentType}`;

    return new Observable(observer => {
      this.http.get(uploadURL, { responseType: 'text' })
        .subscribe(uploadPage => {
          const uploadForm = new FormData();
          const options = submission.options;

          if (contentType === this.getMapping('content', 'Story')) uploadForm.set('UploadForm[textcontent]', submission.submissionData.submissionFile.getFileBuffer().toString('utf-8'));
          else uploadForm.set('UploadForm[binarycontent]', submission.submissionData.submissionFile.getRealFile());

          if (submission.submissionData.thumbnailFile.getRealFile()) uploadForm.set('UploadForm[binarycontent_5]', submission.submissionData.thumbnailFile.getRealFile());

          uploadForm.set('UploadForm[contentLevel]', this.getMapping('rating', submission.submissionData.submissionRating));
          uploadForm.set('UploadForm[P_title]', submission.submissionData.title);
          uploadForm.set('YII_CSRF_TOKEN', HTMLParser.getInputValue(uploadPage, 'YII_CSRF_TOKEN'));
          uploadForm.set('UploadForm[P_hidePublic]', options.viewOptions);
          uploadForm.set('UploadForm[description]', submission.description);

          uploadForm.set('UploadForm[formtags]', this.formatTags(submission.defaultTags, submission.customTags));
          uploadForm.set('UploadForm[folderId]', options.folder);

          this.http.post(uploadURL, uploadForm, { responseType: 'text' }).subscribe(res => {
            try {
              if (res.includes('sfContentTitle')) observer.next(res);
              else observer.error(this.createError(res, submission));
            } catch (e) {
              observer.next(res);
            }
          }, (err: HttpErrorResponse) => {
            try {
              if (!err.error.includes('sfContentTitle')) observer.next(this.createError(err, submission, 'Potential cloudflare issue'));
              else observer.error(this.createError(err, submission));
            } catch (e) {
              observer.next({ msg: 'unknown' });
            }

            observer.complete();
          });
        }, err => {
          observer.error(this.createError(err, submission));
          observer.complete();
        });
    });
  }

  postJournal(title: string, description: string, options: any): Observable<any> {
    const url = `${this.baseURL}/upload/details?contentType=3`

    return new Observable(observer => {
      this.http.get(url, { responseType: 'text' })
        .subscribe(page => {
          const journalData = new FormData();
          journalData.set('YII_CSRF_TOKEN', HTMLParser.getInputValue(page, 'YII_CSRF_TOKEN'));
          journalData.set('UploadForm[P_id]', HTMLParser.getInputValue(page, 'UploadForm[P_id]'));
          journalData.set('UploadForm[P_title]', title);
          journalData.set('UploadForm[textcontent]', description);
          journalData.set('UploadForm[description]', description.split('.')[0]);
          journalData.set('UploadForm[formtags]', this.formatTags(options.tags));
          journalData.set('UploadForm[contentLevel]', this.getMapping('rating', options.rating));
          journalData.set('UploadForm[P_hidePublic]', '0');
          journalData.set('UploadForm[folderId]', '0');
          journalData.set('UploadForm[newFolderName]', '');
          journalData.set('UploadForm[P_isHTML]', '1');
          journalData.set('save', 'Publish');

          this.http.post(url, journalData, { responseType: 'text' }).subscribe(res => {
            observer.next(true);
            observer.complete();
          }, (err: HttpErrorResponse) => {
            observer.error(this.createError(err, { title, description, options }));
            observer.complete();
          });
        }, err => {
          observer.error(this.createError(err, { title, description, options }));
          observer.complete();
        });
    });
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    let tagBuilder = `${defaultTags.join(', ')}, ${other.join(', ')}`;
    return tagBuilder.trim();
  }
}
