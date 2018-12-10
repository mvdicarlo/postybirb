import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { WebsiteCoordinatorService } from '../../services/website-coordinator/website-coordinator.service';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { Observable } from 'rxjs';

@Injectable()
export class PaigeeWorld extends BaseWebsite implements Website {
  private username: string;
  private bearer: string;

  constructor(private http: HttpClient, protected coordinator: WebsiteCoordinatorService) {
    super(SupportedWebsites.PaigeeWorld, 'https://www.paigeeworld.com');
    this.coordinator.insertService(this.websiteName, this);
  }

  private getBearerToken(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.bearer) {
        resolve(true);
        return;
      }

      const win = new window['browserwindow']({ show: false });
      win.loadURL(this.baseURL + '/login');
      win.once('ready-to-show', () => {
        if (win.isDestroyed()) {
          reject(false);
          return;
        }

        win.webContents.executeJavaScript(`localStorage.authToken`).then(function(value) {
          this.bearer = value;
          win.destroy();
          resolve(true);
        }.bind(this));
      });
    });
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise((resolve, reject) => {
      this.getBearerToken().then(() => {
        if (this.bearer) {
          this.http.get(`${this.baseURL}/currentuser`, { headers: new HttpHeaders().append('Authorization', this.bearer), responseType: 'json' })
            .subscribe((user: any) => {
              if (user && user.username) {
                this.username = user.username;
                this.loginStatus = WebsiteStatus.Logged_In;
              } else {
                this.loginStatus = WebsiteStatus.Logged_Out;
              }

              resolve(this.loginStatus);
            });
        } else {
          this.loginStatus = WebsiteStatus.Logged_Out;
          resolve(this.loginStatus);
        }
      }).catch(() => console.error('Unable to retrieve bearer due to window being destroyed.'));
    });
  }

  getUser(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.username) resolve(this.username);
      else reject(false);
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      if (submission.submissionData.submissionRating !== 'General') {
        observer.error(this.createError(null, submission, 'Rating must be General.'));
        observer.complete();
        return;
      }

      const uploadForm = new FormData();
      uploadForm.set('image', submission.submissionData.submissionFile.getRealFile());
      uploadForm.set('caption', submission.description || ' ');
      uploadForm.set('extra_tags', this.formatTags(submission.defaultTags, submission.customTags).join(','));
      uploadForm.set('tags', [this.formatTags(submission.defaultTags, submission.customTags), submission.options.category].join(','));

      // other fields
      uploadForm.set('web', '1');
      uploadForm.set('category', submission.options.category || '');

      this.http.post(`${this.baseURL}/media`, uploadForm, { headers: new HttpHeaders().append('Authorization', this.bearer), responseType: 'json' })
        .subscribe((res: any) => {
          if (res.status === 'OK') {
            observer.next(res);
          } else {
            observer.error(this.createError(res, submission));
          }

          observer.complete();
        }, err => {
          observer.error(this.createError(err, submission));
          observer.complete();
        });
    });
  }
}
