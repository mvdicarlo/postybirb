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
export class Route50 extends BaseWebsite implements Website {

  constructor(private http: HttpClient) {
    super(SupportedWebsites.Route50, 'http://route50.net');
    this.mapping = {
      rating: {
        General: 'tame',
        Mature: 'mature',
        Explicit: 'explicit',
        Extreme: 'extreme',
      },
      content: {
        Artwork: 'image',
        Story: 'text',
        Poetry: 'poetry',
        Music: 'audio',
        Animation: 'flash',
      }
    };
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(this.baseURL, { responseType: 'text' })
        .subscribe(page => {
          if (page.includes('loggedin')) this.loginStatus = WebsiteStatus.Logged_In;
          else this.loginStatus = WebsiteStatus.Logged_Out;

          try {
            const aTags = HTMLParser.getTagsOf(page, 'a');
            const matcher = /class="dispavatar.*"/g;
            if (aTags.length > 0) {
              for (let i = 0; i < aTags.length; i++) {
                let tag = aTags[i];
                if (tag.match(matcher)) {
                  this.info.username = tag.split('"')[3] || null;
                  break;
                }
              }
            }
          } catch (e) { }

          resolve(this.loginStatus);
        }, err => {
          this.loginStatus = WebsiteStatus.Logged_Out;
          resolve(WebsiteStatus.Offline);
        });
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      const uploadForm = new FormData();
      uploadForm.set('title', submission.submissionData.title);
      uploadForm.set('file', submission.submissionData.submissionFile.getRealFile());
      uploadForm.set('thumbnail', submission.submissionData.thumbnailFile.getRealFile());
      uploadForm.set('category', this.getCategoryCode(this.getMapping('content', submission.submissionData.submissionType)));
      uploadForm.set('type', this.getMapping('content', submission.submissionData.submissionType));
      uploadForm.set('tags', this.formatTags(submission.defaultTags, submission.customTags));
      uploadForm.set('description', submission.description);

      //Ignored properties
      uploadForm.set('swf_width', '');
      uploadForm.set('swf_height', '');
      uploadForm.set('minidesc', '');
      uploadForm.set('enableComments', '1');
      uploadForm.set('tos', '1');
      uploadForm.set('coc', '1');

      this.http.post(`${this.baseURL}/galleries/submit`, uploadForm, { responseType: 'text' })
        .subscribe(res => {
          if (res.includes(submission.submissionData.title)) {
            observer.next(res);
          } else observer.error(this.createError(res, submission));
          observer.complete();
        }, (err: HttpErrorResponse) => {
          observer.error(this.createError(err, submission));
          observer.complete();
        });
    });
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    return super.formatTags(defaultTags, other).join(' ');
  }

  private getCategoryCode(type) {
    if (type === 'image') {
      return '9';
    } else if (type === 'text') {
      return '14';
    } else if (type === 'audio') {
      return '15';
    } else if (type === 'flash') {
      return '12';
    }
    return '9';
  }
}
