import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { HTMLParser } from '../../helpers/html-parser';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/operator/retry';

@Injectable()
export class Tumblr extends BaseWebsite implements Website {

  constructor(private http: HttpClient) {
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

  getOtherInfo(): any {
    return {
      blogs: this.helper.getBlogs(),
      username: this.helper.getUsername()
    };
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    const type = this.getMapping('content', submission.submissionData.submissionType);
    const blog = submission.options.blog || this.getOtherInfo().blogs[0].name;
    const title = `<h1>${submission.submissionData.title}</h1>`;
    const rating = this.getMapping('rating', submission.submissionData.submissionRating);
    let description = submission.parseDescription ? submission.description
      .replace(/<div/gm, '<p')
      .replace(/<\/div/gm, '</p')
      .split('\n')
      .join('<br>') : submission.description;

    description = title + description;

    let tags = this.formatTags(submission.defaultTags, submission.customTags);
    if (rating === this.getMapping('rating', 'Explicit') || rating === this.getMapping('rating', 'Mature') || rating === this.getMapping('rating', 'Extreme')) {
      tags += ',#nsfw';
    }

    const additionalFiles = (submission.submissionData.additionalFiles || []).map((additionalFile: any) => {
      return additionalFile.getFileBuffer();
    });

    return Observable.fromPromise(this.helper.post(blog, tags, title, description, type, [submission.submissionData.submissionFile.getFileBuffer(), ...additionalFiles]));
  }

  postJournal(title: string, description: string, options: any): Observable<any> {
    const replacedDescription = description.replace(/<div/gm, '<p').replace(/<\/div/gm, '</p').split('\n').join('<br>');
    return Observable.fromPromise(this.helper.post(options.blog, this.formatTags(options.tags), title, replacedDescription, 'text', undefined))
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const tags = [...defaultTags, ...other];
    return tags.map((tag) => {
      return `#${tag.trim()}`
    }).join(',');
  }
}
