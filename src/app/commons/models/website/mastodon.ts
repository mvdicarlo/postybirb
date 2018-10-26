import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebsiteCoordinatorService } from '../../services/website-coordinator/website-coordinator.service';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { Observable, from } from 'rxjs';

@Injectable()
export class Mastodon extends BaseWebsite implements Website {

  constructor(private http: HttpClient, protected coordinator: WebsiteCoordinatorService) {
    super(SupportedWebsites.Mastodon, 'https://www.mastodon.social', 'mastodon');
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
    return new Promise((resolve, reject) => {
      if (!authInfo.code) {
        resolve(this.helper.getAuthorizationURL(authInfo.site));
      } else {
        this.helper.authorize(authInfo).then(() => {
          resolve(true);
        }).catch(() => {
          reject(false);
        });
      }
    });
  }

  refresh(): Promise<any> {
    return this.helper.refresh();
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    const additionalFiles = (submission.submissionData.additionalFiles || []).map((additionalFile: any) => {
      return { buffer: additionalFile.getFileBuffer(), type: additionalFile.getFileInfo().type };
    });

    const files = [
      { buffer: submission.submissionData.submissionFile.getFileBuffer(), type: submission.submissionData.submissionFile.getFileInfo().type }
      , ...additionalFiles
    ];

    return from(this.helper.post(files, // files
      submission.submissionData.submissionType, // submission type
      submission.description.substring(0, 500).trim(), // status
      submission.submissionData.submissionRating !== 'General', //sensitive,
      submission.options.spoilerText
    ));
  }

  postJournal(data: any): Observable<any> {
    return from(this.helper.post(null, // files
      'Story', // submission type
      data.descriptiondescription.substring(0, 500).trim(), // status
      false, //sensitive,
      null
    ));
  }
}
