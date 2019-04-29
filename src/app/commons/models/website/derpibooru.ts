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
export class Derpibooru extends BaseWebsite implements Website {

  constructor(private http: HttpClient, protected coordinator: WebsiteCoordinatorService) {
    super(SupportedWebsites.Derpibooru, 'https://derpibooru.org');
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

    this.coordinator.insertService(this.websiteName, this);
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(`${this.baseURL}/users/edit`, { responseType: 'text' })
        .subscribe(page => {
          if (page.includes('Logout')) {
            this.loginStatus = WebsiteStatus.Logged_In;

            try {
              const username: string = page.match(/\/profiles\/.*?(?=")/g)[0].split('/')[2];
              this.info.username = username
            } catch (e) { /* Do Nothing */ }
          } else {
            this.loginStatus = WebsiteStatus.Logged_Out;
          }

          resolve(this.loginStatus);
        }, () => {
          this.loginStatus = WebsiteStatus.Logged_Out;
          resolve(this.loginStatus);
        });
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      this.http.get(`${this.baseURL}/images/new`, { responseType: 'text' })
        .subscribe(uploadFormPage => {
          if (!uploadFormPage.includes('Upload an Image')) {
            observer.error(this.createError(uploadFormPage, submission, 'Derpibooru is acting up. Try logging in again.'));
            observer.complete();
            return;
          }

          const options = submission.options;

          const tags: string[] = this.formatTags(submission.defaultTags, submission.customTags, ' ');
          const ratingTag: string = this.getMapping('rating', submission.submissionData.submissionRating);
          if (!tags.includes(ratingTag)) tags.push(ratingTag);

          //Primary
          const uploadForm: FormData = new FormData();
          uploadForm.set('authenticity_token', HTMLParser.getInputValue(uploadFormPage, 'authenticity_token'));
          uploadForm.set('image[tag_input]', tags.join(', ').trim());
          uploadForm.set('image[image]', submission.submissionData.submissionFile.getRealFile());
          uploadForm.set('image[description]', submission.description);

          uploadForm.set('image[source_url]', options.sourceURL || '');

          //Ignored properties
          uploadForm.set('utf8', '✓');
          uploadForm.set('scraper_url', '');
          uploadForm.set('image[anonymous]', '0');
          uploadForm.set('image[image_cache]', '');
          uploadForm.set('commit', 'Create Image');

          this.http.post(`${this.baseURL}/images`, uploadForm, { responseType: 'text'})
          .subscribe(res => {
            try {
              if (res.includes('Uploaded')) observer.next(res);
              else observer.error(this.createError(res, submission));
            } catch (err) {
              observer.error(this.createError({ res, err }, submission));
            }

            observer.complete();
          }, err => {
            observer.error(this.createError(err, submission));
            observer.complete();
          })
        }, err => {
          observer.error(this.createError(err, submission));
          observer.complete();
        });
    });
  }
}
