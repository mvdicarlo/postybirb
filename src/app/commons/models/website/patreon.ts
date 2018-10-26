import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { WebsiteCoordinatorService } from '../../services/website-coordinator/website-coordinator.service';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { Observable } from 'rxjs';

@Injectable()
export class Patreon extends BaseWebsite implements Website {

  constructor(private http: HttpClient, protected coordinator: WebsiteCoordinatorService) {
    super(SupportedWebsites.Patreon, 'https://www.patreon.com');
    this.mapping = {
      rating: {
        General: 0,
        Mature: 1,
        Explicit: 2,
        Extreme: 2,
      },
      content: {
        Artwork: 'image_file',
        Story: 'text_only',
        Music: 'audio_embed',
        Animation: 0,
      },
      post_type: {
        Artwork: 'image_file',
        Music: 'audio_file',
        Story: 'text_only'
      }
    };

    this.coordinator.insertService(this.websiteName, this);
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(this.baseURL, { responseType: 'text' })
        .subscribe(page => {
          if (page.includes('Log In')) this.loginStatus = WebsiteStatus.Logged_Out;
          else this.loginStatus = WebsiteStatus.Logged_In;
          resolve(this.loginStatus);
        }, err => {
          this.loginStatus = WebsiteStatus.Offline;
          resolve(WebsiteStatus.Offline);
        });
    });
  }

  getUser(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http.get(`${this.baseURL}/user`, { responseType: 'text' })
        .subscribe(page => {
          const title = page.match(/<title(.|\s)*?(?=\/title)/)[0] || '';
          const user = title.length > 0 ? title.split(' ')[0].replace('<title>', '') : undefined;
          resolve(user);
        }, err => reject(null));
    });
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      this.http.get(`${this.baseURL}/post`, { responseType: 'text' })
        .subscribe(page => {
          const csrf = page.match(/csrfSignature = ".*"/g)[0].split('"')[1];
          const postUrl = `${this.baseURL}/api/posts?` + 'include=user_defined_tags.null%2Ccampaign.creator.null%2Ccampaign.rewards.campaign.null%2Ccampaign.rewards.creator.null&fields[post]=post_type%2Cmin_cents_pledged_to_view&fields[campaign]=is_monthly&fields[reward]=am' +
            'ount_cents%2Ctitle&fields[user]=[]&fields[post_tag]=value&json-api-version=1.0';
          const data = JSON.stringify({
            data: {
              type: 'post',
              attributes: {
                post_type: this.getMapping('content', submission.submissionData.submissionType)
              }
            }
          });

          this.http.post(postUrl, data, { headers: new HttpHeaders().set('X-CSRF-Signature', csrf) })
            .subscribe((res: any) => {
              const link = `${res.links.self}`;

              const realFile: File = submission.submissionData.submissionFile.getRealFile();
              const qquuid = window.URL.createObjectURL(realFile).split('///')[1];

              const submissionData = new FormData();
              submissionData.set('qquuid', qquuid);
              submissionData.set('qqfilename', realFile.name);
              submissionData.set('qqtotalfilesize', realFile.size.toString());
              submissionData.set('file', realFile);

              this.http.post(`${link}/${submission.submissionData.submissionType !== 'Story' ? 'post_file' : 'attachments'}?json-api-version=1.0`, submissionData,
                { headers: new HttpHeaders().set('X-CSRF-Signature', csrf).set('X-Requested-With', 'XMLHttpRequest') })
                .subscribe((fileResponse: any) => {
                  const data: any = this.createPostData(submission);
                  const url = link + '?include=user.null%2Cattachments.null%2Cuser_defined_tags.null%2Ccampaign.earnings_visibility%2Ccampaign.rewards.null%2Cpoll&fields[post]=category%2Ccents_pledged_at_creation%2Cchange_visibility_at%2Ccomment_count%2Ccontent%2Ccreated_at%2Ccurrent_user_can_delete%2Ccurrent_user_can_view%2Ccurrent_user_has_liked%2Cdeleted_at%2Cearly_access_min_cents%2Cedit_url%2Cedited_at%2Cearly_access_min_cents%2Cembed%2Cimage%2Cis_automated_monthly_charge%2Cis_paid%2Clike_count%2Cmin_cents_pledged_to_view%2Cnum_pushable_users%2Cpatreon_url%2Cpatron_count%2Cpledge_url%2Cpost_file%2Cpost_type%2Cpublished_at%2Cscheduled_for%2Cthumbnail%2Ctitle%2Curl%2Cwas_posted_by_campaign_owner&json-api-version=1.0';

                  this.http.patch(url, JSON.stringify(data), { headers: new HttpHeaders().set('X-CSRF-Signature', csrf) })
                    .subscribe(r => {
                      observer.next(r);
                      observer.complete();
                    }, err => {
                      observer.error(this.createError(err, submission));
                      observer.complete();
                    });
                }, err => {
                  observer.error(this.createError(err, submission));
                  observer.complete();
                });
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

  private createPostData(submission: PostyBirbSubmissionData): any {
    const options = submission.options || {};

    const formattedTags = this.formatTags(submission.defaultTags, submission.customTags);
    const relationshipTags = formattedTags.map(tag => {
      return {
        id: tag.id,
        type: tag.type
      }
    });

    const attributes: any = {
      content: submission.description,
      post_type: this.getMapping('post_type', submission.submissionData.submissionType),
      is_paid: options.chargePatrons,
      min_cents_pledged_to_view: options.patronsOnly ? (options.minimumDollarsToView || 0) * 100 || 1 : (options.minimumDollarsToView || 0) * 100,
      title: submission.submissionData.title,
      tags: { publish: true }
    };

    if (submission.options.schedule) {
      attributes.scheduled_for = options.schedule.toISOString().split('.')[0];
      attributes.tags.publish = false;
    }

    const relationships = {
      post_tag: {
        data: relationshipTags.length > 0 ? relationshipTags[0] : {}
      },
      user_defined_tags: {
        data: relationshipTags
      }
    };

    return {
      data: {
        attributes,
        relationships,
        type: 'post'
      },
      included: formattedTags
    };
  }

  postJournal(data: any): Observable<any> {
    return new Observable(observer => {
      this.http.get(`${this.baseURL}/post`, { responseType: 'text' })
        .subscribe(page => {
          const csrf = page.match(/csrfSignature = ".*"/g)[0].split('"')[1];
          const postUrl = `${this.baseURL}/api/posts?` + 'include=user_defined_tags.null%2Ccampaign.creator.null%2Ccampaign.rewards.campaign.null%2Ccampaign.rewards.creator.null&fields[post]=post_type%2Cmin_cents_pledged_to_view&fields[campaign]=is_monthly&fields[reward]=am' +
            'ount_cents%2Ctitle&fields[user]=[]&fields[post_tag]=value&json-api-version=1.0';
          const postData = JSON.stringify({
            data: {
              type: 'post',
              attributes: {
                post_type: 'text_only'
              }
            }
          });

          this.http.post(postUrl, postData, { headers: new HttpHeaders().set('X-CSRF-Signature', csrf) })
            .subscribe((res: any) => {
              const link = `${res.links.self}`;
              const formattedTags = this.formatTags(data.tags);
              const relationshipTags = formattedTags.map(tag => {
                return {
                  id: tag.id,
                  type: tag.type
                }
              });

              const attributes = {
                content: data.description,
                post_type: 'text_only',
                is_paid: false,
                min_cents_pledged_to_view: 0,
                title: data.title,
                tags: { publish: true }
              };

              const relationships = {
                post_tag: {
                  data: relationshipTags.length > 0 ? relationshipTags[0] : {}
                },
                user_defined_tags: {
                  data: relationshipTags
                }
              };

              const postData = {
                data: {
                  attributes,
                  relationships,
                  type: 'post'
                },
                included: formattedTags
              };

              const url = link + '?include=user.null%2Cattachments.null%2Cuser_defined_tags.null%2Ccampaign.earnings_visibility%2Ccampaign.rewards.null%2Cpoll&fields[post]=category%2Ccents_pledged_at_creation%2Cchange_visibility_at%2Ccomment_count%2Ccontent%2Ccreated_at%2Ccurrent_user_can_delete%2Ccurrent_user_can_view%2Ccurrent_user_has_liked%2Cdeleted_at%2Cearly_access_min_cents%2Cedit_url%2Cedited_at%2Cearly_access_min_cents%2Cembed%2Cimage%2Cis_automated_monthly_charge%2Cis_paid%2Clike_count%2Cmin_cents_pledged_to_view%2Cnum_pushable_users%2Cpatreon_url%2Cpatron_count%2Cpledge_url%2Cpost_file%2Cpost_type%2Cpublished_at%2Cscheduled_for%2Cthumbnail%2Ctitle%2Curl%2Cwas_posted_by_campaign_owner&json-api-version=1.0';

              this.http.patch(url, JSON.stringify(postData), { headers: new HttpHeaders().set('X-CSRF-Signature', csrf) })
                .subscribe(response => {
                  observer.next(true);
                  observer.complete();
                }, err => {
                  observer.error(this.createError(err, data));
                  observer.complete();
                });
            }, err => {
              observer.error(this.createError(err, data));
              observer.complete();
            })
        }, err => {
          observer.error(this.createError(err, data));
          observer.complete();
        });
    });
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const tags = [...defaultTags, ...other].slice(0, 5);
    return tags.map(tag => {
      return {
        type: 'post_tag',
        id: `user_defined;${tag}`,
        attributes: {
          value: tag,
          cardinality: 1
        }
      };
    });
  }
}
