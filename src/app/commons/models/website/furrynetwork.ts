import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { WebsiteCoordinatorService } from '../../services/website-coordinator/website-coordinator.service';
import { Website } from '../../interfaces/website.interface';
import { BaseWebsite } from './base-website';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { Observable } from 'rxjs';
import { FileObject } from '../../interfaces/file-obect.interface';
import { FileInformation } from '../file-information';

@Injectable()
export class FurryNetwork extends BaseWebsite implements Website {
  private userInformation: any;
  private collections: any = {
    artwork: [],
    story: [],
    multimedia: []
  };

  private userCollections: any = {};

  constructor(private http: HttpClient, protected coordinator: WebsiteCoordinatorService) {
    super(SupportedWebsites.FurryNetwork, 'https://furrynetwork.com');

    this.userInformation = db.get(SupportedWebsites.FurryNetwork.toLowerCase()).value() || {
      name: null,
      token: null,
    };

    this.mapping = {
      rating: {
        General: 0,
        Mature: 1,
        Explicit: 2,
        Extreme: 2,
      },
      content: {
        Artwork: 'artwork',
        Story: 'story',
        Poetry: 0,
        Music: 'multimedia',
        Animation: 'multimedia',
      }
    };

    this.coordinator.insertService(this.websiteName, this, 30 * 60000);
  }

  getStatus(): Promise<WebsiteStatus> {
    return new Promise(resolve => {
      this.http.get(this.baseURL, { responseType: 'text' })
        .subscribe(page => {
          if (this.userInformation.name) {
            this.http.get(`${this.baseURL}/api/user`,
              { headers: new HttpHeaders().set('Authorization', `Bearer ${this.userInformation.token.access_token}`) })
              .subscribe((info: any) => {
                this.info = info;
                this.loginStatus = WebsiteStatus.Logged_In;
                for (let i = 0; i < info.characters.length; i++) {
                  this.loadCollections(info.characters[i].name);
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
          resolve(WebsiteStatus.Offline);
        });
    });
  }

  public loadCollections(username: string): void {
    const collections = {};
    const keys = Object.keys(this.collections);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      this.http.get(`${this.baseURL}/api/character/${username}/${key}/collections`,
        { headers: new HttpHeaders().set('Authorization', `Bearer ${this.userInformation.token.access_token}`) })
        .subscribe((collection: any[]) => {
          collections[key] = collection;
          this.userCollections[username] = collections;
        }, err => {
          // should we do anything with this?
        });
    }
  }

  getCollectionsForUser(username): any {
    return this.userCollections[username];
  }

  getLoginStatus(): WebsiteStatus {
    return this.loginStatus;
  }

  getUser(): Promise<string> {
    return new Promise((resolve, reject) => {
      resolve(this.userInformation.name || null);
    });
  }

  authorize(authInfo: any): Promise<any> {
    return new Promise((resolve, reject) => {

      const tokenRequestForm = new FormData();
      tokenRequestForm.set('username', authInfo.username);
      tokenRequestForm.set('password', authInfo.password);
      tokenRequestForm.set('grant_type', 'password');
      tokenRequestForm.set('client_id', '123');
      tokenRequestForm.set('client_secret', '');

      this.http.post(`${this.baseURL}/api/oauth/token`, tokenRequestForm)
        .subscribe(res => {
          this.userInformation.token = res;

          this.http.get(`${this.baseURL}/api/user`, { headers: new HttpHeaders().set('Authorization', `Bearer ${this.userInformation.token.access_token}`) })
            .subscribe((info: any) => {
              this.userInformation.name = info.characters[0].name;
              db.set(SupportedWebsites.FurryNetwork.toLowerCase(), this.userInformation).write();
              resolve(true);
            }, err => reject(false));
        }, err => {
          reject(false);
        });
    });
  }

  unauthorize(): any {
    this.userInformation = {
      name: '',
      token: null,
    };

    this.loginStatus = WebsiteStatus.Logged_Out;
    db.unset(SupportedWebsites.FurryNetwork.toLowerCase()).write();
  }

  refresh(): Promise<any> {
    return new Promise((resolve, reject) => {
      const storedToken = db.get(SupportedWebsites.FurryNetwork.toLowerCase()).value();
      if (!storedToken.token) reject('No token');
      this.http.post(`${this.baseURL}/api/oauth/token`, `client_id=123&grant_type=refresh_token&refresh_token=${storedToken.token.refresh_token}`, { headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded') }).subscribe((res: any) => {
        this.userInformation = storedToken;
        this.userInformation.token.access_token = res.access_token;
        db.set(SupportedWebsites.FurryNetwork.toLowerCase(), this.userInformation).write();
        resolve(`Refreshed ${this.websiteName}`);
      }, err => {
        this.unauthorize();
        reject(`Unable to refresh ${this.websiteName}`);
      });
    });
  }

  public checkAuthorized(): Promise<boolean> {
    return this.refresh();
  }

  private generateUploadUrl(userProfile: string, file: File, type: any): string {
    let uploadURL = '';

    if (type === 'story') {
      uploadURL = `${this.baseURL}/api/story`;
    } else {
      uploadURL = `${this.baseURL}/api/submission/${userProfile}/${type}/upload?` +
        'resumableChunkNumber=1' +
        `&resumableChunkSize=${file.size}` + `&resumableCurrentChunkSize=${file.size
        }&resumableTotalSize=${file.size
        }&resumableType=${file.type
        }&resumableIdentifier=${file.size}-${file.name.replace('.', '')
        }&resumableFilename=${file.name
        }&resumableRelativePath=${file.name
        }&resumableTotalChunks=1`;
    }

    return uploadURL;
  }

  private generatePostData(submission: PostyBirbSubmissionData, type: any): object {
    if (type === 'story') {
      return {
        collections: submission.options.folders || [],
        description: submission.description || submission.submissionData.title,
        status: submission.options.status,
        title: submission.submissionData.title,
        tags: this.formatTags(submission.defaultTags, submission.customTags),
        rating: this.getMapping('rating', submission.submissionData.submissionRating),
        community_tags_allowed: submission.options.communityTags,
        content: submission.submissionData.submissionFile.getFileBuffer().toString('utf-8')
      };
    } else {
      return {
        collections: submission.options.folders || [],
        description: submission.description,
        status: submission.options.status,
        title: submission.submissionData.title,
        tags: this.formatTags(submission.defaultTags, submission.customTags),
        rating: this.getMapping('rating', submission.submissionData.submissionRating),
        community_tags_allowed: submission.options.communityTags,
        publish: submission.options.notify,
      };
    }
  }

  post(submission: PostyBirbSubmissionData): Observable<any> {
    return new Observable(observer => {
      try {
        const userProfile = submission.options.profile || this.userInformation.name;
        let type = this.getMapping('content', submission.submissionData.submissionType);
        const file = submission.submissionData.submissionFile.getRealFile();
        const headers: HttpHeaders = new HttpHeaders().set('Authorization', `Bearer ${this.userInformation.token.access_token}`);

        if (file.type === 'image/gif') type = 'multimedia';
        let uploadURL = this.generateUploadUrl(userProfile, file, type);

        if (type === 'story') {
          try {
            this.http.post(uploadURL, JSON.stringify(this.generatePostData(submission, type)), { headers: headers })
              .subscribe(res => {
                observer.next(res);
                observer.complete();
              }, err => {
                observer.error(this.createError(err, submission));
                observer.complete();
              });
          } catch (e) {
            observer.error(this.createError(e, submission));
            observer.complete();
          }
        } else {
          this.postChunks(userProfile, type, submission.submissionData.submissionFile, headers)
          .then(fileInfo => {
            if (!fileInfo) {
              observer.error(this.createError('fileInfo is null for post', submission));
              observer.complete();
              return;
            }
            try {
              this.http.patch(`${this.baseURL}/api/${type}/${fileInfo.id}`, this.generatePostData(submission, type), { headers: headers })
                .subscribe(res => {
                  observer.next(res);
                  observer.complete();

                  if (type === 'multimedia' && submission.submissionData.thumbnailFile.isValid()) {
                    const thumbnailFile = submission.submissionData.thumbnailFile.getRealFile();
                    const thumbnailURL = `${this.baseURL}/api/submission/${userProfile}/${type}/${fileInfo.id}/thumbnail?` +
                      'resumableChunkNumber=1' +
                      `&resumableChunkSize=${thumbnailFile.size}` + `&resumableCurrentChunkSize=${thumbnailFile.size}
                      &resumableTotalSize=${thumbnailFile.size}
                      &resumableType=${thumbnailFile.type}
                      &resumableIdentifier=${thumbnailFile.size}-${thumbnailFile.name.replace('.', '')}
                      &resumableFilename=${thumbnailFile.name}&resumableRelativePath=${thumbnailFile.name}
                      &resumableTotalChunks=1`;

                    this.http.post(thumbnailURL, thumbnailFile, { headers: headers })
                      .subscribe(success => {
                        //NOTHING TO DO
                      }, err => {
                        //NOTHING TO DO
                      });
                  }
                }, (err) => {
                  let msg = '';
                  try {
                    if (err && err.error && err.error.errors) {
                      const keys = Object.keys(err.error.errors);
                      for (let i = 0; i < keys.length; i++) {
                        msg += `${keys[i].toUpperCase()}: ${keys[i] + err.error.errors[keys[i]].toString()}\n`;
                      }
                    }
                  } catch (e) { }

                  observer.error(this.createError(err, submission, msg.trim()));
                  observer.complete();
                });
            } catch (e) {
              observer.error(this.createError(e, submission));
              observer.complete();
            }
          })
          .catch(err => {
            observer.error(this.createError(err, submission));
            observer.complete();
          })
        }
      } catch (e) {
        observer.error(this.createError(e, submission));
        observer.complete();
      }
    });
  }

  chunkArray(myArray, chunk_size): Buffer[] {
    var index = 0;
    var arrayLength = myArray.length;
    var tempArray = [];

    for (index = 0; index < arrayLength; index += chunk_size) {
        let myChunk = myArray.slice(index, index+chunk_size);
        // Do something if you want with the group
        tempArray.push(myChunk);
    }

    return tempArray;
  }

  async postChunks(userProfile: any, type: any, file: FileInformation, headers: any): Promise<any> {
    const maxChunkSize = 524288;
    const partitions = this.chunkArray(file.getFileBuffer(), maxChunkSize);
    let fileInfo = null;

    for (let i = 0; i < partitions.length; i++) {
        fileInfo = await this.uploadChunk(headers, userProfile, type, i + 1, partitions.length, file.getFileInfo(), partitions[i], maxChunkSize);
    }

    return fileInfo;
  }

  uploadChunk(headers: any, userProfile: string, type: string, current: number, total: number, file: FileObject, buffer: any, chunkSize: number): Promise<any> {
    const url = `${this.baseURL}/api/submission/${userProfile}/${type}/upload?` +
      `resumableChunkNumber=${current}` +
      `&resumableChunkSize=${chunkSize}` + `&resumableCurrentChunkSize=${buffer.length
      }&resumableTotalSize=${file.size
      }&resumableType=${file.type
      }&resumableIdentifier=${file.size}-${file.name.replace('.', '')
      }&resumableFilename=${file.name
      }&resumableRelativePath=${file.name
      }&resumableTotalChunks=${total}`;

      return new Promise((resolve, reject) => {
        this.http.post<any>(url, new Blob([new Uint8Array(buffer.subarray(0, buffer.length))], {}), { headers, responseType: 'json' })
        .subscribe(res => {
          resolve(res);
        }, err => reject(err))
      });
  }

  postJournal(data: any): Observable<any> {
    return new Observable(observer => {
      const postData = {
        community_tags_allowed: false,
        collections: [],
        content: data.description,
        description: data.description.split('.')[0],
        rating: this.getMapping('rating', data.rating),
        title: data.title,
        subtitle: null,
        tags: this.formatTags(data.tags),
        status: 'public'
      };

      this.http.post(`${this.baseURL}/api/journal`, postData, { headers: new HttpHeaders().set('Authorization', `Bearer ${this.userInformation.token.access_token}`) })
        .subscribe(res => {
          observer.next(true);
          observer.complete();
        }, err => {
          observer.error(this.createError(err, data));
          observer.complete();
        });
    });
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    return super.formatTags(defaultTags, other, '-').filter(tag => tag.length <= 30 && tag.length >= 3)
      .map(tag => { return tag.replace(/(\(|\)|:|#|;|\]|\[|')/g, '') })
      .filter(tag => tag.length >= 3)
      .slice(0, 30);
  }
}
