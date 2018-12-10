import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebsiteCoordinatorService } from '../../services/website-coordinator/website-coordinator.service';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { HTMLParser } from '../../helpers/html-parser';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { Observable } from 'rxjs';

@Injectable()
export class Newgrounds extends BaseWebsite implements Website {

  constructor(private http: HttpClient, protected coordinator: WebsiteCoordinatorService) {
    super(SupportedWebsites.Newgrounds, 'https://newgrounds.com');
    this.coordinator.insertService(this.websiteName, this);
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(this.baseURL, { responseType: 'text' })
        .subscribe(page => {
          if (page.includes('passport_login')) {
            this.loginStatus = WebsiteStatus.Logged_Out;
          } else {
            try {
              this.info.username = page.match(/"name":".*?"/g)[0].split(':')[1].replace(/"/g, '');
            } catch (e) { }
            this.loginStatus = WebsiteStatus.Logged_In;
          }

          resolve(this.loginStatus);
        }, err => {
          this.loginStatus = WebsiteStatus.Logged_Out;
          resolve(WebsiteStatus.Offline);
        });
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      this.http.get(`${this.baseURL}/art/submit/create`, { responseType: 'text' })
        .subscribe(uploadPage => {
          const options = submission.options;

          const data: any = {
            userkey: HTMLParser.getInputValue(uploadPage, 'userkey'),
            title: submission.submissionData.title,
            description: submission.description,
            file_path: {
              value: submission.submissionData.submissionFile.getFileBuffer(),
              options: {
                contentType: submission.submissionData.submissionFile.getFileInfo().type,
                filename: submission.submissionData.submissionFile.getFileInfo().name || 'upload.jpg'
              }
            },
            cc_commercial: options.commercial ? 'on' : 'off',
            cc_modification: options.modification ? 'on' : 'off',
            category_id: options.category,
            nudity: options.nudity,
            violence: options.violence,
            language_textual: options.text,
            adult_themes: options.adult,
            thumb_crop_width: 450,
            thumb_crop_height: 450,
            thumb_top_x: 175,
            thumb_top_y: 0
          };

          const tags = this.formatTags(submission.defaultTags, submission.customTags, '-').slice(0, 12); // find out if m/m is legal
          for (let i = 0; i < tags.length; i++) {
            data[`tag_${i}`] = tags[i];
          }

          if (!options.sketch) {
            data.public = '1'
          }
          if (options.creativeCommons) {
            data.use_creative_commons = 'on';
          }

          window['newgrounds'].post(data)
            .then((res) => {
              observer.next(res);
              observer.complete();
            }).catch(err => {
              observer.error(err);
              observer.complete();
            });
        });
    });
  }
}
