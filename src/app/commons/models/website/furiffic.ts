import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { Observable } from 'rxjs';

@Injectable()
export class Furiffic extends BaseWebsite implements Website {

  constructor(private http: HttpClient) {
    super(SupportedWebsites.Furiffic, 'https://www.furiffic.com');
    this.mapping = {
      rating: {
        General: 'tame',
        Mature: 'mature',
        Explicit: 'adult',
        Extreme: 'adult',
      },
      content: {
        Artwork: 'submission',
        Story: 'story',
        Poetry: 'poetry',
        Music: 'music',
        Animation: 'flash',
      }
    };
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(this.baseURL, { responseType: 'text' })
        .subscribe(page => {
          if (page.includes('logout')) {
            this.loginStatus = WebsiteStatus.Logged_In;

            try {
              const username = page.match(/src=".*com\/accounts\/.*s/gm)[0].split('"')[1].split('/')[4].trim() || null;
              this.info.username = username;
            } catch (e) { /* Do Nothing */ }
          }
          else this.loginStatus = WebsiteStatus.Logged_Out;
          resolve(this.loginStatus);
        }, err => {
          this.loginStatus = WebsiteStatus.Offline;
          resolve(this.loginStatus);
        });
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      const file = submission.submissionData.submissionFile.getRealFile();

      const preForm = new FormData();
      preForm.set('items[0][name]', file.name);
      preForm.set('items[0][mimeType]', file.type);
      preForm.set('items[0][size]', file.size);
      preForm.set('items[0][clientId]', '0');

      this.http.post(`${this.baseURL}/${this.info.username}/gallery/preupload`, preForm)
        .subscribe(preUploadResponse => {
          const id = preUploadResponse[0].id;

          const uploadFile = new FormData();
          uploadFile.set('file', submission.submissionData.submissionFile.getRealFile());
          uploadFile.set('id', id);

          this.http.post(`${this.baseURL}/${this.info.username}/gallery/upload`, uploadFile)
            .subscribe(() => {
              const retrieveUploadDataForm = new FormData();
              retrieveUploadDataForm.set('mediaIds[]', id);

              this.http.post(`${this.baseURL}/${this.info.username}/gallery/uploaddata`, retrieveUploadDataForm)
                .subscribe(uploadData => {
                  const editForm = new FormData();
                  editForm.set('rating', this.getMapping('rating', submission.submissionData.submissionRating));
                  editForm.set('name', submission.submissionData.title.substring(0, 30));
                  editForm.set('category', uploadData[0].category);
                  editForm.set('visibility', 'public');
                  editForm.set('folderVisibility', 'any');
                  editForm.set('description', `${submission.description || ''}`);

                  if (submission.submissionData.thumbnailFile && submission.submissionData.thumbnailFile.getRealFile()) {
                    editForm.set('thumbnailFile', submission.submissionData.thumbnailFile.getRealFile());
                    editForm.set('thumbnail[size][height]', '375');
                    editForm.set('thumbnail[size][width]', '300');
                    editForm.set('thumbnail[center][x]', '150');
                    editForm.set('thumbnail[center][y]', '187.5');
                    editForm.set('thumbnail[scale]', '0');
                  }

                  const tags = this.formatTags(submission.defaultTags, submission.customTags);
                  for (let i = 0; i < tags.length; i++) {
                    editForm.append('tags[]', tags[i]);
                  }

                  this.http.post(`${this.baseURL}/${this.info.username}/edit/${id}`, editForm, { responseType: 'text' })
                    .subscribe(() => {
                      const publish = new FormData();
                      publish.set('ids[]', id);
                      this.http.post(`${this.baseURL}/${this.info.username}/gallery/publish`, publish)
                        .subscribe(() => {
                          observer.next(true);
                          observer.complete();
                        }, err => {
                          observer.error(this.createError(err, submission));
                          observer.complete();
                        });
                    }, err => {
                      observer.error(this.createError(err, submission));
                      observer.complete();
                    });
                }, err => {
                  observer.error(this.createError(err, submission));
                  observer.complete();
                });
            }, err => {
              observer.error(this.createError(err, submission));
              observer.complete();
            });
        }, err => {
          observer.error(this.createError(err, submission));
          observer.complete();
        });
    });
  }

  postJournal(title: string, description: string, options: any): Observable<any> {
    return new Observable(observer => {
      this.http.get(`${this.baseURL}/${this.info.username}/journals/create`, { responseType: 'text' })
        .subscribe(page => {
          const journalData = new FormData();
          journalData.set('type', 'textual');
          journalData.set('name', title);
          journalData.set('link', '');
          journalData.set('body', `[p]${description}[/p]`);
          journalData.set('shortDescription', description.split('.')[0]);
          journalData.set('thumbnailReset', '');
          journalData.set('thumbnailFile', '');
          journalData.set('visibility', 'public');
          journalData.set('rating', this.getMapping('rating', options.rating));

          const tags = this.formatTags(options.tags);
          for (let i = 0; i < tags.length; i++) {
            journalData.append('tags[]', tags[i]);
          }

          let csrf = page.match(/csrfSeed = .*;/g) || [];
          let csrfValue = '';
          if (csrf.length > 0) {
            csrf[0].split('=')[1].replace(';', '').trim();
          }

          journalData.set('__csrf', csrfValue);

          this.http.post(`${this.baseURL}/${this.info.username}/journals/create`, journalData, { responseType: 'text' })
            .subscribe(() => {
              observer.next(true);
              observer.complete();
            }, err => {
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
    const tags = [...defaultTags, ...other];
    return tags.map((tag) => {
      return tag.trim().replace(/-/gm, ' ').replace(/(\/|\\)/gm, ' ');
    }).slice(0, 30);
  }
}
