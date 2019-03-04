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
import { FileInformation } from '../file-information';

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

          const file: File = submission.submissionData.submissionFile.getRealFile();
          const userkey = HTMLParser.getInputValue(uploadPage, 'userkey');
          const data1: any = {
            userkey,
            qquuid: window.URL.createObjectURL(file).split('///')[1],
            qqfilename: file.name,
            qqtotalfilesize: file.size,
            qqfile: {
                  value: submission.submissionData.submissionFile.getFileBuffer(),
                  options: {
                    contentType: submission.submissionData.submissionFile.getFileInfo().type,
                    filename: submission.submissionData.submissionFile.getFileInfo().name || 'upload.jpg'
                  }
            }
          };

          const thumbfile: FileInformation = submission.submissionData.thumbnailFile.realFile ? submission.submissionData.thumbnailFile : submission.submissionData.submissionFile;
          const thumb: File = thumbfile.getRealFile();
          const nativeImg = nativeImage.createFromBuffer(thumbfile.getFileBuffer());
          const sizes = nativeImg.getSize();
          const data2: any = {
            userkey,
            title: submission.submissionData.title,
            description: `<p>${submission.description}</p>`.replace(/\n/g, '<br>'),
            thumbnail: {
              value: thumbfile.getFileBuffer(),
              options: {
                contentType: thumb.type,
                filename: 'blob'
              }
            },
            cc_commercial: options.commercial ? 'yes' : 'no',
            cc_modification: options.modification ? 'yes' : 'no',
            category_id: options.category,
            nudity: options.nudity,
            violence: options.violence,
            language_textual: options.text,
            adult_themes: options.adult,
            encoder: 2,
            thumb_crop_width: sizes.width,
            thumb_crop_height: sizes.height,
            thumb_top_x: 0,
            thumb_top_y: 0,
            thumb_animation_frame: 0,
            'tags[]': this.formatTags(submission.defaultTags, submission.customTags)
          };

          if (options.creativeCommons) {
            data2.use_creative_commons = 1;
          }

          if (!options.sketch) {
            data2.public = '1'
          }

          window['newgrounds'].post(data1, data2)
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

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    return super.formatTags(defaultTags, other, '-')
      .map(tag => { return tag.replace(/(\(|\)|:|#|;|\]|\[|')/g, '').replace(/_/g, '-') })
      .slice(0, 12);
  }
}
