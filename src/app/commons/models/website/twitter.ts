import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebsiteCoordinatorService } from '../../services/website-coordinator/website-coordinator.service';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { Observable } from 'rxjs';

@Injectable()
export class Twitter extends BaseWebsite implements Website {

  constructor(private http: HttpClient, protected coordinator: WebsiteCoordinatorService) {
    super(SupportedWebsites.Twitter, 'https://www.twitter.com', 'twitter');
    this.coordinator.insertService(this.websiteName, this, 120 * 60000);
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      if (this.helper.isAuthorized()) this.loginStatus = WebsiteStatus.Logged_In;
      else this.loginStatus = WebsiteStatus.Logged_Out;
      resolve(this.loginStatus);
    });
  }

  getUser(): Promise<string> {
    return new Promise((resolve, reject) => {
      resolve(this.helper.getUsername() || null);
    });
  }

  authorize(authInfo: any): Promise<any> {
    if (authInfo.step === 1) { //get URL step
      return new Promise((resolve, reject) => {
        resolve(this.helper.getAuthorizationURL());
      });
    } else if (authInfo.step === 2) { //set PIN step
      return new Promise((resolve, reject) => {
        this.helper.setTwitterPin(authInfo.pin).then((success) => {
          resolve(true);
        }, (err) => {
          reject(false);
        });
      });
    }
  }

  refresh(): Promise<any> {
    return this.helper.refresh();
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    const additionalFiles = (submission.submissionData.additionalFiles || []).map((additionalFile: any) => {
      return { buffer: additionalFile.getFileBuffer().toString('base64'), type: additionalFile.getFileInfo().type };
    });

    return new Observable(observer => {
      this.helper.post(`${submission.options.useTitle ? submission.submissionData.title + '\n\n': ''}${submission.description}`.substring(0, 280).trim(),
        [
          { buffer: submission.submissionData.submissionFile.getFileBuffer().toString('base64'), type: submission.submissionData.submissionFile.getFileInfo().type }
          , ...additionalFiles
        ])
        .then((res) => {
          observer.next(res);
          observer.complete();
        }).catch((err) => {
          observer.error(err);
          observer.complete();
        });
    });
  }

  postJournal(data: any): Observable<any> {
    return new Observable(observer => {
      this.helper.post(data.description.substring(0, 280).trim())
        .then((res) => {
          observer.next(res);
          observer.complete();
        }).catch((err) => {
          observer.error(err);
          observer.complete();
        });
    });
  }
}
