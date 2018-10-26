import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { WebsiteCoordinatorService } from '../../services/website-coordinator/website-coordinator.service';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { HTMLParser } from '../../helpers/html-parser';
import { Observable } from 'rxjs';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';

@Injectable()
export class Weasyl extends BaseWebsite implements Website {

  constructor(private http: HttpClient, protected coordinator: WebsiteCoordinatorService) {
    super(SupportedWebsites.Weasyl, 'https://www.weasyl.com');
    this.mapping = {
      rating: {
        General: 10,
        Mature: 30,
        Explicit: 40,
        Extreme: 40,
      },
      content: {
        Artwork: 'visual',
        Story: 'literary',
        Poetry: 'literary',
        Music: 'multimedia',
        Animation: 'multimedia',
        Character: 'character',
        Journal: 'journal',
      }
    };

    this.coordinator.insertService(this.websiteName, this);
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get<any>(`${this.baseURL}/api/whoami`).subscribe(info => {
        if (info && info.login) {
          this.http.get<any>(`${this.baseURL}/api/users/${info.login}/view`).subscribe(user => {
            this.info = user;
            this.loginStatus = WebsiteStatus.Logged_In;
            resolve(WebsiteStatus.Logged_In);
          }, () => {
            this.loginStatus = WebsiteStatus.Logged_Out;
            resolve(WebsiteStatus.Logged_Out);
          });
        } else {
          this.loginStatus = WebsiteStatus.Logged_Out;
          resolve(WebsiteStatus.Logged_Out);
        }
      }, () => {
        this.loginStatus = WebsiteStatus.Logged_Out;
        resolve(WebsiteStatus.Logged_Out);
      });
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    let weasylURL = `${this.baseURL}/submit/`;
    const type = this.getMapping('content', submission.submissionData.submissionType);
    weasylURL += type;

    return new Observable(observer => {
      this.http.get(weasylURL, { responseType: 'text' }).subscribe(uploadPage => {
        const uploadForm = new FormData();
        uploadForm.set('token', HTMLParser.getInputValue(uploadPage, 'token'));

        //Primary
        uploadForm.set('title', submission.submissionData.title);
        uploadForm.set('submitfile', submission.submissionData.submissionFile.getRealFile());
        if (submission.submissionData.thumbnailFile.getRealFile()) uploadForm.set('thumbfile', submission.submissionData.thumbnailFile.getRealFile());
        uploadForm.set('redirect', weasylURL);
        uploadForm.set('rating', this.getMapping('rating', submission.submissionData.submissionRating));
        if (type === 'literary' || type === 'multimedia') uploadForm.set('coverfile', '');
        uploadForm.set('tags', this.formatTags(submission.defaultTags, submission.customTags));
        uploadForm.set('content', submission.description);

        // Extra options
        const options = submission.options;
        if (!options.notify) uploadForm.set('nonotification', 'on');
        if (options.friendsOnly) uploadForm.set('friends', 'on');
        if (options.critique) uploadForm.set('critique', 'on');
        if (options.folder) uploadForm.set('folderid', options.folder);
        else uploadForm.set('folderid', '');

        //Ignored properties
        uploadForm.set('subtype', '');

        this.http.post(weasylURL, uploadForm, { responseType: 'text' }).subscribe(res => {
          if (res.includes('Submission Information')) {
            observer.next(res);
            observer.complete();
          } else if (res.includes('Choose Thumbnail')) {
            const thumbnailData: FormData = new FormData();
            thumbnailData.set('token', HTMLParser.getInputValue(res, 'token'));
            thumbnailData.set('submitid', HTMLParser.getInputValue(res, 'submitid'));
            thumbnailData.set('x1', '0');
            thumbnailData.set('y1', '0');
            thumbnailData.set('x2', '0');
            thumbnailData.set('y2', '0');
            thumbnailData.set('thumbfile', '');

            this.http.post(`${this.baseURL}/manage/thumbnail`, thumbnailData, { responseType: 'text' }).subscribe(() => {
              observer.next(res);
              observer.complete();
            }, (err) => {
              observer.error(this.createError(err, submission));
              observer.complete();
            });
          } else {
            observer.error(this.createError(res, submission));
            observer.complete();
          }
        }, (err: HttpErrorResponse) => {
          if (err.url.match(/submission\/\d+/g)) {
            observer.next(err);
            observer.complete();
          } else {
            observer.error(this.createError(err, submission));
            observer.complete();
          }
        });
      }, err => {
        observer.error(this.createError(err, submission));
        observer.complete();
      });
    });
  }

  postJournal(data: any): Observable<any> {
    return new Observable(observer => {
      this.http.get(`${this.baseURL}/submit/journal`, { responseType: 'text' }).subscribe(uploadPage => {
        const journalData = new FormData();
        journalData.set('token', HTMLParser.getInputValue(uploadPage, 'token'));
        journalData.set('title', data.title);
        journalData.set('rating', this.getMapping('rating', data.rating));
        journalData.set('content', data.description);
        journalData.set('tags', this.formatTags(data.tags) || '');

        this.http.post(`${this.baseURL}/submit/journal`, journalData, { responseType: 'text' }).subscribe(() => {
          observer.next(true);
          observer.complete();
        }, (err: HttpErrorResponse) => {
          if (err.error.includes('allowed ratings')) {
            observer.next(err);
          } else {
            observer.error(this.createError(err, data));
          }

          observer.complete();
        });
      }, err => {
        observer.error(this.createError(err, data));
        observer.complete();
      });
    });
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    return super.formatTags(defaultTags, other).join(' ');
  }
}
