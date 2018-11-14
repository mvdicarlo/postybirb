import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebsiteCoordinatorService } from '../../services/website-coordinator/website-coordinator.service';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { Observable } from 'rxjs';
import { HTMLParser } from '../../helpers/html-parser';

@Injectable()
export class FurryAmino extends BaseWebsite implements Website {

  constructor(private http: HttpClient, protected coordinator: WebsiteCoordinatorService) {
    super(SupportedWebsites.FurryAmino, 'https://aminoapps.com/c/furry-amino/home/');
    this.coordinator.insertService(this.websiteName, this);
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(this.baseURL, { responseType: 'text' })
        .subscribe(page => {
          if (!page.includes('Sign In')) {
            this.loginStatus = WebsiteStatus.Logged_In;
            try {
              const aTags = HTMLParser.getTagsOf(page, 'a') || [];
              for (let i = 0; i < aTags.length; i++) {
                  const tag = aTags[i];
                  if (tag.includes('user-link')) {
                    this.info.username = tag.match(/user\/.*?(?=\/)/g)[0].split('/')[1].trim();
                    break;
                  }
              }
              this.info.ndcId = page.match(/"ndcId": ".*?"/g)[0].split(':')[1].replace(/\D/g, '').trim();
              this._loadCategories();
            } catch (e) {
              this.loginStatus = WebsiteStatus.Logged_Out;
            }
          } else {
            this.loginStatus = WebsiteStatus.Logged_Out;
          }
          resolve(this.loginStatus);
        }, err => {
          this.loginStatus = WebsiteStatus.Offline;
          resolve(this.loginStatus);
        });
    });
  }

  private _loadCategories(): void {
    if (this.info.ndcId) {
      this.http.get<any>(`https://aminoapps.com/api/get-blog-category?ndcId=${this.info.ndcId}`)
      .subscribe((res: any) => {
        if (res.code == 200) {
          const categories: any[] = [];
          for (let i = 0; i < res.result.length; i++) {
              const category = res.result[i];
              if (category.type == 1) {
                categories.push({
                  label: category.label,
                  nested: []
                });
              } else {
                categories[categories.length - 1].nested.push({
                  label: category.label,
                  categoryId: category.categoryId
                });
              }
          }

          this.info.categories = categories;
        }
      });
    }
  }

  private _postImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const data: FormData = new FormData();
      data.set('qqparentuuid', window.URL.createObjectURL(file).split('///')[1]);
      data.set('qquuid', window.URL.createObjectURL(file).split('///')[1]);
      data.set('qqparentsize', file.size.toString());
      data.set('qqtotalfilesize', file.size.toString());
      data.set('qqfilename', file.name);
      data.set('avatar', file);

      this.http.post<any>('https://aminoapps.com/api/upload-image', data)
      .subscribe((res: any) => {
        if (res.code == 200) {
          resolve(res.result.mediaValue);
        } else {
          reject(res);
        }
      }, err => {
        reject(err);
      });
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      if (submission.submissionData.submissionRating !== 'General') {
        observer.error(this.createError('Invalid rating', submission, 'Furry Amino only accepts General rating.'));
        observer.complete();
        return;
      }

      const promises: any[] = [];
      promises.push(this._postImage(submission.submissionData.submissionFile.getRealFile()));
      if (submission.submissionData.additionalFiles && submission.submissionData.additionalFiles.length) {
        submission.submissionData.additionalFiles.forEach(f => promises.push(this._postImage(f.getRealFile())));
      }

      Promise.all(promises)
      .catch(err => {
        observer.error(this.createError(err, submission));
        observer.complete();
      })
      .then((mediaIds: string[]) => {
        const mediaList: any[] = [];
        let content: string = '';
        for (let i = 0; i < mediaIds.length; i++) {
            content += `[IMG=${i}] `;
            mediaList.push([
              100,
              mediaIds[i],
              "",
              `${i}`
            ]);
        }

        content += submission.description;

        const data = {
          ndcId: this.info.ndcId,
          postJSON: {
            content,
            extensions: {
              fansOnly: false
            },
            mediaList,
            taggedBlogCategoryIdList: submission.options.categories,
            title: submission.submissionData.title,
            type: 0
          }
        };

        window['amino'].post(data) // avoided setting as helper because I only need it to post
        .then(res => {
          observer.next(res);
          observer.complete();
        }).catch(err => {
          observer.error(this.createError(err, submission));
          observer.complete();
        });
      });
    });
  }

}
