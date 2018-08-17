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
export class Pixiv extends BaseWebsite implements Website {

  constructor(private http: HttpClient) {
    super(SupportedWebsites.Pixiv, 'https://www.pixiv.net');
    this.mapping = {
      rating: {
        General: 0,
        Mature: 1,
        Explicit: 2,
        Extreme: 2,
      },
      content: {
        Artwork: 'illust',
        Story: 0,
        Music: 0,
        Animation: 0,
      }
    };
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(this.baseURL, { responseType: 'text' })
        .subscribe(page => {
          if (page.includes('Logout')) this.loginStatus = WebsiteStatus.Logged_In;
          else this.loginStatus = WebsiteStatus.Logged_Out;
          resolve(this.loginStatus);
        }, err => {
          this.loginStatus = WebsiteStatus.Offline;
          resolve(WebsiteStatus.Offline);
        });
    });
  }

  getUser(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http.get(this.baseURL, { responseType: 'text' })
        .subscribe(page => {
          try {
            const username = page.match(/<a\sclass="(?=user-name).*?(?=<)/g)[0].split('>')[1];
            if (username) resolve(username);
            else reject(null);
          } catch (e) {
            reject(Error(`Not logged in to ${this.websiteName}`));
          }
        }, err => reject(Error(`Unable to access ${this.websiteName}`)));
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      this.http.get(`${this.baseURL}/upload.php`, { responseType: 'text' })
        .subscribe(page => {
          const uploadForm = this.createFormData(submission);
          uploadForm.set('tt', HTMLParser.getInputValue(page, 'tt', 2));
          this.http.post(`${this.baseURL}/upload.php`, uploadForm, { responseType: 'text' })
            .subscribe((res: any) => {
              if (typeof res === 'string') res = JSON.parse(res);
              if (!res.error) observer.next(res);
              else observer.error(this.createError(res, submission));
              observer.complete();
            }, (err: HttpErrorResponse) => {
              observer.error(this.createError(err, submission));
              observer.complete();
            });
        }, err => {
          observer.error(this.createError(err, submission));
          observer.complete();
        });
    });
  }

  private createFormData(submission: PostyBirbSubmissionData): FormData {
    const uploadForm = new FormData();
    const rating = this.getMapping('rating', submission.submissionData.submissionRating);
    uploadForm.set('title', submission.submissionData.title.substring(0, 32));
    uploadForm.set('uptype', this.getMapping('content', submission.submissionData.submissionType));
    uploadForm.set('x_restrict_sexual', rating);
    uploadForm.set('sexual', '');
    uploadForm.set('tag', this.formatTags(submission.defaultTags, submission.customTags));
    uploadForm.set('comment', submission.description);

    //Ignored properties
    uploadForm.set('rating', '1');
    uploadForm.set('suggested_tags', '');
    uploadForm.set('mode', 'upload');
    uploadForm.set('book_style', '0');
    uploadForm.set('restrict', '0'); // privacy
    uploadForm.set('quality[]', '');
    uploadForm.set('quality_text', '');
    uploadForm.set('qropen', '');

    // File properties
    const additionalFiles: any[] = submission.submissionData.additionalFiles || [];
    uploadForm.set('files[]', submission.submissionData.submissionFile.getRealFile());

    if (additionalFiles.length > 0) {
      const file: any = submission.submissionData.submissionFile.getRealFile();
      uploadForm.append('file_info[]', JSON.stringify({ name: file.name, size: file.size, type: file.type }));

      for (let i = 0; i < additionalFiles.length; i++) {
        const file: any = additionalFiles[i].getRealFile();
        uploadForm.append('files[]', file);
        uploadForm.append('file_info[]', JSON.stringify({ name: file.name, size: file.size, type: file.type }));
      }
    }

    const options = submission.options;
    if (!options.communityTags) uploadForm.set('taglock', '1');
    if (options.original) uploadForm.set('original', 'on');

    const sexualType = options.restrictSexual;
    if (options.sexual && sexualType === '0') {
      uploadForm.set('sexual', 'implicit');
    } else if (sexualType !== '0') {
      uploadForm.set('x_restrict_sexual', sexualType);
      if (options.sexualTypes) {
        for (let i = 0; i < options.sexualTypes.length; i++) {
          uploadForm.set(options.sexualTypes[i], 'on');
        }
      }
    }

    return uploadForm;
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    return super.formatTags(defaultTags, other).slice(0, 10).join(' ');
  }
}
