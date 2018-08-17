import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { HTMLParser } from '../../helpers/html-parser';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { Observable } from 'rxjs';

@Injectable()
export class Furaffinity extends BaseWebsite implements Website {

  constructor(private http: HttpClient) {
    super(SupportedWebsites.Furaffinity, 'https://www.furaffinity.net');
    this.mapping = {
      rating: {
        General: 0,
        Mature: 2,
        Explicit: 1,
        Extreme: 1,
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

  private parseFolders(page: string): void {
    const furAffinityFolders = { Ungrouped: [] };
    const select = page.match(/<select(.|\s)*?(?=\/select)/g)[0] + '/select>';
    const element = $.parseHTML(select);
    let options = $(element).find('option') || [];

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];

      if (opt.value === '0') continue;

      if (opt.parentElement.tagName === 'OPTGROUP') {
        if (!furAffinityFolders[opt.parentElement.label]) {
          furAffinityFolders[opt.parentElement.label] = [];
        }

        furAffinityFolders[opt.parentElement.label].push({
          label: opt.innerHTML.replace(/\[.*\]/, '').trim(),
          value: opt.value
        });
      } else {
        furAffinityFolders.Ungrouped.push({
          label: opt.innerHTML.replace(/\[.*\]/, '').trim(),
          value: opt.value
        });
      }
    }

    this.otherInformation.folders = Object.keys(furAffinityFolders).map(key => {
      return { name: key, items: furAffinityFolders[key] };
    }) || [];
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(this.baseURL, { responseType: 'text' })
        .subscribe(page => {
          if (page.includes('logout-link')) {
            this.http.get(`${this.baseURL}/controls/submissions`, { responseType: 'text' })
              .subscribe(controlPage => {
                try {
                  this.parseFolders(controlPage);
                } catch (e) { console.warn('Unable to get folders', e) }
                this.loginStatus = WebsiteStatus.Logged_In;
                resolve(WebsiteStatus.Logged_In);
              }, () => {
                this.loginStatus = WebsiteStatus.Logged_In;
                resolve(WebsiteStatus.Logged_In);
              });
          } else {
            this.loginStatus = WebsiteStatus.Logged_Out;
            resolve(this.loginStatus);
          }
        }, () => {
          this.loginStatus = WebsiteStatus.Offline;
          resolve(WebsiteStatus.Offline);
        });
    });
  }

  getUser(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http.get(this.baseURL, { responseType: 'text' })
        .subscribe(page => {
          const aTags = HTMLParser.getTagsOf(page, 'a');
          const matcher = /href="\/user\/.*"/g;
          if (aTags.length > 0) {
            for (let i = 0; i < aTags.length; i++) {
              let tag = aTags[i];
              if (tag.match(matcher)) {
                resolve(tag.match(matcher)[0].split('/')[2] || null);
                return;
              }
            }
            reject(null);
          } else {
            reject(Error(`Not logged in to ${this.websiteName}`));
          }
        }, () => reject(Error(`Unable to access ${this.websiteName}`)));
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      const initForm: FormData = new FormData();
      initForm.set('part', '2');
      initForm.set('submission_type', this.getMapping('content', submission.submissionData.submissionType));

      this.http.post(`${this.baseURL}/submit/`, initForm, { responseType: 'text' }).subscribe(fileSubmitPage => {
        const uploadForm = new FormData();
        uploadForm.set('key', HTMLParser.getInputValue(fileSubmitPage, 'key'));
        uploadForm.set('part', '3');

        uploadForm.set('submission', submission.submissionData.submissionFile.getRealFile());
        uploadForm.set('thumbnail', submission.submissionData.thumbnailFile.getRealFile());
        uploadForm.set('submission_type', this.getMapping('content', submission.submissionData.submissionType));

        this.http.post(`${this.baseURL}/submit/`, uploadForm, { responseType: 'text' })
          .subscribe(uploadPage => {
            if (!uploadPage.includes('Finalize Submission')) {
              observer.error(this.createError(uploadPage, submission));
              observer.complete();
            } else {
              const submitForm = new FormData();
              const options = submission.options;

              submitForm.set('part', '5');
              submitForm.set('key', HTMLParser.getInputValue(uploadPage, 'key'));

              //Primary
              submitForm.set('title', submission.submissionData.title);
              submitForm.set('submission_type', this.getMapping('content', submission.submissionData.submissionType));
              submitForm.set('cat_duplicate', '');
              submitForm.set('cat', options.category);
              submitForm.set('atype', options.theme);
              submitForm.set('species', options.species);
              submitForm.set('gender', options.gender);
              submitForm.set('rating', this.getMapping('rating', submission.submissionData.submissionRating));
              submitForm.set('create_folder_name', '');
              submitForm.set('keywords', this.formatTags(submission.defaultTags, submission.customTags));
              submitForm.set('message', submission.description);

              // Extra options
              if (options.disableComments) submitForm.set('lock_comments', 'on');
              if (options.scraps) submitForm.set('scrap', '1');

              // Folders
              for (let i = 0; i < options.folders.length; i++) {
                submitForm.append('folder_ids[]', options.folders[i]);
              }

              this.http.post(`${this.baseURL}/submit/`, submitForm, { responseType: 'text' })
                .subscribe(res => {
                  if (!res.includes('Finalize')) observer.next(res);
                  else observer.error(this.createError(res, submission));
                  observer.complete();
                }, err => {
                  observer.error(this.createError(err, submission));
                  observer.complete();
                });
            }
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

  postJournal(title: string, description: string): Observable<any> {
    return new Observable(observer => {
      this.http.get(`${this.baseURL}/controls/journal`, { responseType: 'text' })
        .subscribe(page => {
          const journalData = new FormData();
          journalData.set('key', HTMLParser.getInputValue(page, 'key'));
          journalData.set('message', description);
          journalData.set('subject', title);
          journalData.set('submit', 'Create / Update Journal');
          journalData.set('id', '');
          journalData.set('do', 'update');

          this.http.post(`${this.baseURL}/controls/journal/`, journalData, { responseType: 'text' })
            .subscribe(() => {
              observer.next(true);
              observer.complete();
            }, err => {
              observer.error(this.createError(err, { title, description }));
              observer.complete();
            });
        }, err => {
          observer.error(this.createError(err, { title, description }));
          observer.complete();
        });
    });
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const maxLength = 250;
    const tags = super.formatTags(defaultTags, other);
    let tagString = tags.join(' ').trim();

    return tagString.length > maxLength ? tagString.substring(0, maxLength).split(' ').filter(tag => tag.length >= 3).join(' ') : tagString;
  }

}
