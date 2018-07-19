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
export class HentaiFoundry extends BaseWebsite implements Website {

  constructor(private http: HttpClient) {
    super(SupportedWebsites.HentaiFoundry, 'https://www.hentai-foundry.com');
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
        .subscribe((page: string) => {
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
      this.http.get(`${this.baseURL}`, { responseType: 'text' })
        .subscribe(page => {
          try {
            resolve(page.match(/\/user\/.*?(?=\/)/g)[0].split('/')[2]);
          } catch (e) {
            reject(false);
          }
        }, err => reject(Error(`Not logged in to ${this.websiteName}`)));
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      this.http.get(`${this.baseURL}/pictures/create`, { responseType: 'text' })
        .subscribe(uploadFormPage => {
          const options = submission.options;

          const uploadForm = new FormData();
          uploadForm.set('YII_CSRF_TOKEN', HTMLParser.getInputValue(uploadFormPage, 'YII_CSRF_TOKEN'));
          uploadForm.set('Pictures[user_id]', HTMLParser.getInputValue(uploadFormPage, 'Pictures[user_id]'));
          uploadForm.set('Pictures[title]', submission.submissionData.title);
          uploadForm.set('Pictures[description]', submission.description);
          uploadForm.set('Pictures[fileupload]', submission.submissionData.submissionFile.getRealFile());
          uploadForm.set('Pictures[submissionPolicyAgree]', '1');
          uploadForm.set('yt0', 'Create');

          const tags: string = this.formatTags(submission.defaultTags, submission.customTags);
          uploadForm.set('Pictures[keywords]', tags);

          uploadForm.set('Pictures[is_scrap]', options.scraps ? '1' : '0');
          uploadForm.set('Pictures[comments_type]', options.disableComments ? '-1' : '0');
          uploadForm.set('Pictures[categoryHier]', options.category);
          uploadForm.set('Pictures[rating_nudity]', options.nudityRating);
          uploadForm.set('Pictures[rating_violence]', options.violenceRating);
          uploadForm.set('Pictures[rating_profanity]', options.profanityRating);
          uploadForm.set('Pictures[rating_racism]', options.racismRating);
          uploadForm.set('Pictures[rating_sex]', options.sexRating);
          uploadForm.set('Pictures[rating_spoilers]', options.spoilersRating);
          uploadForm.set('Pictures[rating_yaoi]', options.yaoi ? '1' : '0');
          uploadForm.set('Pictures[rating_yuri]', options.yuri ? '1' : '0');
          uploadForm.set('Pictures[rating_teen]', options.teen ? '1' : '0');
          uploadForm.set('Pictures[rating_guro]', options.guro ? '1' : '0');
          uploadForm.set('Pictures[rating_furry]', options.furry ? '1' : '0');
          uploadForm.set('Pictures[rating_beast]', options.beast ? '1' : '0');
          uploadForm.set('Pictures[rating_male]', options.male ? '1' : '0');
          uploadForm.set('Pictures[rating_female]', options.female ? '1' : '0');
          uploadForm.set('Pictures[rating_futa]', options.futa ? '1' : '0');
          uploadForm.set('Pictures[rating_other]', options.other ? '1' : '0');
          uploadForm.set('Pictures[rating_scat]', options.scat ? '1' : '0');
          uploadForm.set('Pictures[rating_incest]', options.incest ? '1' : '0');
          uploadForm.set('Pictures[rating_rape]', options.rape ? '1' : '0');
          uploadForm.set('Pictures[media_id]', options.media);
          uploadForm.set('Pictures[time_taken]', options.timeTaken || '');
          uploadForm.set('Pictures[reference]', options.reference || '');
          uploadForm.set('Pictures[license_id]', '0'); //unknown if others exist

          this.http.post(`${this.baseURL}/pictures/create`, uploadForm, { responseType: 'text' })
            .subscribe((res: any) => {
              if (!res.includes('Submit new picture')) observer.next(res);
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

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const maxLength = 75;
    const tags = super.formatTags(defaultTags, other);
    let tagString = tags.join(' ').trim();

    if (tagString.length > maxLength) {
      const newTags = [];

      tagString.substring(0, maxLength)
        .split(' ')
        .forEach((tag) => {
          if (tag.length >= 3) {
            newTags.push(tag);
          }
        });

      tagString = newTags.join(' ');
    }

    return tagString;
  }
}
