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
export class Derpibooru extends BaseWebsite implements Website {

  constructor(private http: HttpClient) {
    super(SupportedWebsites.Derpibooru, 'https://www.derpibooru.org');
    this.mapping = {
      rating: {
        General: 'safe',
        Mature: 'questionable',
        Explicit: 'explicit',
        Extreme: 'explicit'
      },
      content: {
        Artwork: 1,
        Story: 0,
        Music: 0,
        Animation: 0,
      }
    };
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(`${this.baseURL}`, { responseType: 'text' })
        .subscribe(page => {
          if (page.includes('Logout')) this.loginStatus = WebsiteStatus.Logged_In;
          else this.loginStatus = WebsiteStatus.Logged_Out;
          resolve(this.loginStatus);
        }, err => {
          this.loginStatus = WebsiteStatus.Offline;
          resolve(this.loginStatus);
        });
    });
  }

  getUser(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http.get(`${this.baseURL}/users/edit`, { responseType: 'text' })
        .subscribe(page => {
          const username: string = page.match(/\/profiles\/.*?(?=")/g)[0].split('/')[2];
          username ? resolve(username) : reject(null);
        }, err => reject(Error(`Not logged in to ${this.websiteName}`)));
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      this.http.get(`${this.baseURL}/images/new`, { responseType: 'text' })
        .subscribe(uploadFormPage => {
          const uploadForm = new FormData();
          const options = submission.options;

          const tags: string[] = this.formatTags(submission.defaultTags, submission.customTags);
          const ratingTag: string = this.getMapping('rating', submission.submissionData.submissionRating);
          if (!tags.includes(ratingTag)) tags.push(ratingTag);

          //Primary
          uploadForm.set('authenticity_token', HTMLParser.getInputValue(uploadFormPage, 'authenticity_token'));
          uploadForm.set('image[tag_input]', tags.join(', ').trim());
          uploadForm.set('image[image]', submission.submissionData.submissionFile.getRealFile());
          uploadForm.set('image[description]', submission.description);

          uploadForm.set('image[source_url]', options.sourceURL || '');

          //Ignored properties
          uploadForm.set('utf8', '✓');
          uploadForm.set('scraper_url', '');
          uploadForm.set('commit', 'Create Image');
          uploadForm.set('image[anonymous]', '0');
          uploadForm.set('image[image_cache]', '');
          uploadForm.set('commit', 'Create Image');

          this.http.post(`${this.baseURL}/images`, uploadForm, { responseType: 'text' })
            .subscribe((res: any) => {
              if (res.includes('Uploaded')) observer.next(res);
              else observer.error(this.createError(res, submission));
              observer.complete();
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
}
