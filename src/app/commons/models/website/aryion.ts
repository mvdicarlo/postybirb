import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { HTMLParser } from '../../helpers/html-parser';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { Observable, from } from 'rxjs';

@Injectable()
export class Aryion extends BaseWebsite implements Website {

  constructor(private http: HttpClient) {
    super(SupportedWebsites.Aryion, 'https://aryion.com', 'aryion');
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(`${this.baseURL}/forum`, { responseType: 'text' })
        .subscribe(page => {
          if (page.includes('Logout')) {
            this.loginStatus = WebsiteStatus.Logged_In;
            this.getFolders();

            try {
              const aTags = HTMLParser.getTagsOf(page, 'a') || [];
              for (let i = 0; i < aTags.length; i++) {
                const tag = aTags[i];
                if (tag.includes('g4/user/')) {
                  this.info.username = tag.split('/')[3].replace('"', '').trim();
                  break;
                }
              }

              this.http.get(`${this.baseURL}/g4/gallery/${this.info.username}`, { responseType: 'text' })
                .subscribe(galleryPage => {
                  if (!galleryPage.includes('New Item')) {
                    this.info.username = 'No Upload Privileges';
                  }

                  resolve(this.loginStatus);
                });
            } catch (e) {
              this.loginStatus = WebsiteStatus.Logged_Out;
              resolve(this.loginStatus);
            }
          } else {
            this.loginStatus = WebsiteStatus.Logged_Out;
            resolve(this.loginStatus);
          }
        }, () => {
          this.loginStatus = WebsiteStatus.Logged_Out;
          resolve(this.loginStatus);
        });
    });
  }

  getFolders(): any {
    this.http.get(`${this.baseURL}/g4/treeview.php`, { responseType: 'text' })
      .subscribe(treePage => {
        const folders: any[] = [];
        const html = $.parseHTML(treePage);

        $(html).find('.folder').each((index, el) => {
          folders.push({
            value: $(el).attr('data-tid'),
            label: $(el).text()
          });
        });

        this.info.folders = folders;
      });
  }

  checkAuthorized(): Promise<boolean> {
    return new Promise(resolve => resolve(true));
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return from(this.helper.post({
      action: 'new-item',
      parentid: submission.options.folderId,
      MAX_FILE_SIZE: '78643200',
      title: submission.submissionData.title,
      file: {
        value: submission.submissionData.submissionFile.getFileBuffer(),
        options: {
          contentType: submission.submissionData.submissionFile.getFileInfo().type,
          filename: submission.submissionData.submissionFile.getFileInfo().name || 'upload.jpg'
        }
      },
      thumb: submission.submissionData.thumbnailFile ? {
        value: submission.submissionData.thumbnailFile.getFileBuffer(),
        options: {
          contentType: submission.submissionData.thumbnailFile.getFileInfo().type,
          filename: submission.submissionData.thumbnailFile.getFileInfo().name || 'thumbnail.jpg'
        }
      } : '',
      desc: submission.description,
      tags: this.formatTags(submission.defaultTags, submission.customTags).join('\n'),
      'reqtag[]': submission.options.reqtag === 1 ? 'Non-Vore' : '',
      view_perm: submission.options.viewPerm,
      comment_perm: submission.options.commentPerm,
      tag_perm: submission.options.tagPerm,
      scrap: submission.options.scraps ? 'on' : ''
    }));
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const tags = [...defaultTags, ...other];
    return tags.map((tag) => {
      return tag.trim();
    });
  }
}
