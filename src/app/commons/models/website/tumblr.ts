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
export class Tumblr extends BaseWebsite implements Website {

  constructor(private http: HttpClient, protected coordinator: WebsiteCoordinatorService) {
    super(SupportedWebsites.Tumblr, 'https://www.tumblr.com', 'tumblr');
    this.mapping = {
      rating: {
        General: 0,
        Mature: 1,
        Explicit: 2,
        Extreme: 2,
      },
      content: {
        Artwork: 'photo',
        Story: 0,
        Poetry: 0,
        Music: 'audio',
        Animation: 'video',
      }
    };

    this.coordinator.insertService(this.websiteName, this, 120 * 60000);
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      if (this.helper.isAuthorized()) {
        this.loginStatus = WebsiteStatus.Logged_In;
      } else {
        this.loginStatus = WebsiteStatus.Logged_Out;
      }

      resolve(this.loginStatus);
    });
  }

  getUser(): Promise<string> {
    return new Promise((resolve, reject) => {
      resolve(this.helper.getUsername() || null);
    });
  }

  getInfo(): any {
    return {
      blogs: this.helper.getBlogs(),
      username: this.helper.getUsername()
    };
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    const options = submission.options;

    const type = this.getMapping('content', submission.submissionData.submissionType);
    const blog = submission.options.blog || this.getInfo().blogs[0].name;
    const title = options.useTitle ? `<h1>${submission.submissionData.title}</h1>` : '';
    const rating = this.getMapping('rating', submission.submissionData.submissionRating);
    let description = submission.parseDescription ? submission.description : submission.description;

    description = title + description;

    let tags = this.formatTags(submission.defaultTags, submission.customTags);
    if (rating === this.getMapping('rating', 'Explicit') || rating === this.getMapping('rating', 'Mature') || rating === this.getMapping('rating', 'Extreme')) {
      if (!(tags || '').toLowerCase().includes('#nsfw')) {
        tags = '#nsfw,' + tags;
      }
    }

    const additionalFiles = (submission.submissionData.additionalFiles || []).map((additionalFile: any) => {
      return additionalFile.getRealFile();
    });

    return new Observable(observer => {
      this.helper.post(blog, tags, title, description, type, [submission.submissionData.submissionFile.getRealFile(), ...additionalFiles])
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
      this.helper.post(data.options.blog || this.getInfo().blogs[0].name, this.formatTags(data.tags), data.title, data.description, 'text', undefined)
        .then((res) => {
          observer.next(res);
          observer.complete();
        }).catch((err) => {
          observer.error(err);
          observer.complete();
        });
    });
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const tags = [...defaultTags, ...other];
    return tags.map((tag) => {
      return `#${tag.trim()}`
    }).join(',');
  }
}
