import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { HTMLParser } from '../../helpers/html-parser';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/retry';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';

@Injectable()
export class Weasyl extends BaseWebsite implements Website {

  constructor(private http: HttpClient) {
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
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get<any>(`${this.baseURL}/api/whoami`).retry(1).subscribe(info => {
        if (info && info.login) {
          this.http.get<any>(`${this.baseURL}/api/users/${info.login}/view`).retry(1).subscribe(user => {
            this.otherInformation = user;
            this.loginStatus = WebsiteStatus.Logged_In;
            resolve(WebsiteStatus.Logged_In);
          }, err => {
            this.loginStatus = WebsiteStatus.Logged_Out;
            resolve(WebsiteStatus.Logged_Out);
          });
        } else {
          this.loginStatus = WebsiteStatus.Logged_Out;
          resolve(WebsiteStatus.Logged_Out);
        }
      }, err => {
        this.loginStatus = WebsiteStatus.Logged_Out;
        resolve(WebsiteStatus.Logged_Out);
      });
    });
  }

  getUser(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http.get<any>(`${this.baseURL}/api/whoami`).retry(1)
        .subscribe(info => resolve(info.login || null), err => reject(err));
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
            observer.next(true);
            observer.complete();
          } else {
            observer.error(this.createError(res, submission));
            observer.complete();
          }
        }, (err: HttpErrorResponse) => {
          if (err.url.match(/submission\/\d+/g)) {
            observer.next(true);
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

  postJournal(title: string, description: string, options: any): Observable<any> {
    return new Observable(observer => {
      this.http.get(`${this.baseURL}/submit/journal`, { responseType: 'text' }).retry(1).subscribe(uploadPage => {
        const journalData = new FormData();
        journalData.set('token', HTMLParser.getInputValue(uploadPage, 'token'));
        journalData.set('title', title);
        journalData.set('rating', this.getMapping('rating', options.rating));
        journalData.set('content', description);
        journalData.set('tags', this.formatTags(options.tags) || '');

        this.http.post(`${this.baseURL}/submit/journal`, journalData, { responseType: 'text' }).subscribe(res => {
          observer.next(true);
          observer.complete();
        }, (err: HttpErrorResponse) => {
          if (err.error.includes('allowed ratings')) {
            observer.next(err);
          } else {
            observer.error(this.createError(err, { title, description, options }));
          }

          observer.complete();
        });
      }, err => {
        observer.error(this.createError(err, { title, description, options }));
        observer.complete();
      });
    });
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    return super.formatTags(defaultTags, other).join(' ');
  }
}
