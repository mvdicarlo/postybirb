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
export class Inkbunny extends BaseWebsite implements Website {
  private userInformation: any;

  constructor(private http: HttpClient) {
    super(SupportedWebsites.Inkbunny, 'https://inkbunny.net');

    this.userInformation = db.get(SupportedWebsites.Inkbunny.toLowerCase()).value() || {
      name: null,
      sid: null,
    };

    this.mapping = {
      rating: {
        General: '0',
        Mature: '2',
        Explicit: '4',
        Extreme: '4',
      },
      content: {
        Artwork: 1,
        Story: 1,
        Poetry: 1,
        Music: 0,
        Animation: 1,
      }
    };
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(this.baseURL, { responseType: 'text' })
        .subscribe(page => {
          if (!page.includes('LOGIN')) {
            if (this.userInformation.name) this.loginStatus = WebsiteStatus.Logged_In;
          } else {
            this.loginStatus = WebsiteStatus.Logged_Out;
            this.unauthorize();
            resolve(this.loginStatus);
            return;
          }

          // check sid too
          if (this.userInformation.sid) {
            const formData = new FormData();
            formData.set('sid', this.userInformation.sid);
            formData.set('limit', '5');
            this.http.post(`${this.baseURL}/api_watchlist.php`, formData, { responseType: 'text' })
              .subscribe((res: any) => {
                if (JSON.parse(res).error_code) {
                  this.loginStatus = WebsiteStatus.Logged_Out;
                  this.userInformation.sid = null;
                  db.unset(SupportedWebsites.Inkbunny.toLowerCase()).write();
                } else {
                  this.loginStatus = WebsiteStatus.Logged_In;
                }

                resolve(this.loginStatus);
              }, err => {
                this.loginStatus = WebsiteStatus.Logged_Out;
                resolve(this.loginStatus);
              });
          } else {
            this.loginStatus = WebsiteStatus.Logged_Out;
            resolve(this.loginStatus);
          }
        }, err => {
          this.loginStatus = WebsiteStatus.Offline;
          resolve(this.loginStatus);
        });
    });
  }

  getUser(): Promise<string> {
    return new Promise((resolve, reject) => {
      resolve(this.userInformation.name || null);
    });
  }

  private loginToActual(username: string, password: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.get(`${this.baseURL}/login.php`, { responseType: 'text' })
        .subscribe(page => {
          const loginForm: FormData = new FormData();
          loginForm.set('token', HTMLParser.getInputValue(page, 'token'));
          loginForm.set('username', username);
          loginForm.set('password', password);

          this.http.post(`${this.baseURL}/login_process.php`, loginForm, { responseType: 'text' })
            .subscribe((res) => {
              //Assume success?
              resolve(true);
            }, err => {
              reject(err)
            });
        });
    });
  }

  private logoutActual(): void {
    this.http.get(this.baseURL, { responseType: 'text' }).subscribe(page => {
      const logoutData: FormData = new FormData();
      logoutData.set('token', HTMLParser.getInputValue(page, 'token'));
      this.http.post(`${this.baseURL}/logout_process.php`, logoutData, { responseType: 'text' })
        .subscribe(() => {
          //Success?
        }, err => { console.error(err) });
    }, err => { console.error(err) });
  }

  authorize(authInfo: any): Promise<any> {
    return new Promise(function(resolve, reject) {
      const url = `${this.baseURL}/api_login.php?`;
      const { password, username } = authInfo;

      if (!password || !username) {
        reject(false);
      } else {
        this.http.post(`${url}username=${username}&password=${encodeURIComponent(password)}`) // testing encode
          .subscribe((res: any) => {
            if (res && res.sid) {
              this.userInformation = {
                name: username,
                sid: res.sid
              };
              this.loginToActual(username, password)
                .then(() => {
                  db.set(SupportedWebsites.Inkbunny.toLowerCase(), this.userInformation).write();
                  resolve(true);
                }).catch(() => reject(false));

            } else {
              reject(false);
            }
          }, err => reject(false));
      }
    }.bind(this));
  }

  unauthorize(): any {
    this.userInformation = {
      name: '',
      sid: null,
    };

    this.loginStatus = WebsiteStatus.Logged_Out;
    db.unset(SupportedWebsites.Inkbunny.toLowerCase()).write();
    this.logoutActual();
  }

  public checkAuthorized(): Promise<boolean> {
    return new Promise(function(resolve, reject) {
      this.userInformation && this.userInformation.sid ? resolve(true) : reject(false);
    }.bind(this));
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    const urlPost = `${this.baseURL}/api_upload.php`;
    const urlEdit = `${this.baseURL}/api_editsubmission.php`;

    return new Observable(observer => {
      const uploadForm = new FormData();
      uploadForm.set('sid', this.userInformation.sid.toString());
      uploadForm.set('uploadedfile[0]', submission.submissionData.submissionFile.getRealFile());
      if (submission.submissionData.additionalFiles && submission.submissionData.additionalFiles.length > 0) {
        for (let i = 0; i < submission.submissionData.additionalFiles.length; i++) {
          uploadForm.set(`uploadedfile[${i + 1}]`, submission.submissionData.additionalFiles[i].getRealFile());
        }
      }
      if (submission.submissionData.thumbnailFile.getRealFile()) uploadForm.set('uploadedthumbnail[]', submission.submissionData.thumbnailFile.getRealFile());

      this.http.post(urlPost, uploadForm)
        .subscribe((res: any) => {
          if (!(res && res.sid && res.submission_id)) {
            observer.error(this.createError(res, submission));
            observer.complete();
          } else {
            const editForm = new FormData();

            editForm.set('sid', res.sid);
            editForm.set('submission_id', res.submission_id);
            editForm.set('title', submission.submissionData.title);
            editForm.set('desc', submission.description);


            const rating = this.getMapping('rating', submission.submissionData.submissionRating);
            if (rating !== 0) {
              editForm.set(`tag[${rating}]`, 'yes');
            }

            editForm.set('keywords', this.formatTags(submission.defaultTags, submission.customTags));

            // Extra options
            const options = submission.options;
            if (options.scraps) editForm.set('scraps', 'yes');
            if (!options.notify) editForm.set('visibility', 'yes_nowatch');
            else editForm.set('visibility', 'yes');

            if (options.blockGuests) editForm.set('guest_block', 'yes');
            if (options.friendsOnly) editForm.set('friends_only', 'yes');

            this.http.post(urlEdit, editForm)
              .subscribe(editResponse => {
                observer.next(editResponse);
                observer.complete();
              }, err => {
                observer.error(this.createError(err, submission));
                observer.complete();
              });
          }
        }, err => {
          observer.error(this.createError(err, submission));
          observer.complete();
        });
    });
  }

  postJournal(data: any): Observable<any> {
    return new Observable(observer => {
      this.http.get(`${this.baseURL}/newjournal_process.php`, { responseType: 'text' })
        .subscribe(page => {
          const journalData: FormData = new FormData();
          journalData.set('token', HTMLParser.getInputValue(page, 'token'));
          journalData.set('title', data.title);
          journalData.set('content', data.description);

          this.http.post(`${this.baseURL}/newjournal_process.php`, journalData, { responseType: 'text' })
            .subscribe(() => {
              observer.next(true);
              observer.complete();
            }, err => {
              observer.error(this.createError(err, data));
              observer.complete();
            });
        }, err => {
          observer.error(this.createError(err, data));
          observer.complete();
        });
    });
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const tags = [...defaultTags, ...other];
    return tags.map((tag) => {
      return tag.trim().replace(/\s/gm, '_').replace(/\\/gm, '/');
    }).join(',').trim();
  }
}
