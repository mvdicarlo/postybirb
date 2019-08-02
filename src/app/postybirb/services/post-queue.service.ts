import { Injectable } from '@angular/core';
import { Submission } from 'src/app/database/models/submission.model';
import { TabManager } from './tab-manager.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { PostManagerService } from './post-manager.service';
import { SnotifyService } from 'ng-snotify';
import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { GeneratedThumbnailDBService } from 'src/app/database/model-services/generated-thumbnail.service';
import { SubmissionFileType } from 'src/app/database/tables/submission-file.table';
import { TranslateService } from '@ngx-translate/core';
import { PostResult } from 'src/app/websites/interfaces/website-service.interface';
import { PostLoggerService } from './post-logger.service';
import { blobToUint8Array } from 'src/app/utils/helpers/file.helper';
import { shareReplay } from 'rxjs/operators';
import * as dotProp from 'dot-prop';

export interface PostQueueStatus {
  currentId: number;
  waiting?: Date;
  website?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PostQueueService {
  private queue: Submission[] = [];
  private posting: Submission;
  private useWaitIntervalIfSet: boolean = false;
  private timeout: any;

  private queueSubject: BehaviorSubject<Submission[]> = new BehaviorSubject([]);
  public readonly changes: Observable<Submission[]> = this.queueSubject.asObservable();

  private statusSubject: BehaviorSubject<PostQueueStatus> = new BehaviorSubject({ currentId: null });
  public readonly statusUpdates: Observable<PostQueueStatus> = this.statusSubject.asObservable().pipe(shareReplay(1));

  constructor(
    private _tabManager: TabManager,
    private _postManager: PostManagerService,
    private _submissionDB: SubmissionDBService,
    private _generatedThumbnailDB: GeneratedThumbnailDBService,
    private _postLogger: PostLoggerService,
    private _translate: TranslateService,
    private snotify: SnotifyService
  ) { }

  public enqueue(submission: Submission): void {
    const index: number = this.queue.findIndex(s => s.id === submission.id);
    if (index === -1) {
      if (this._tabManager.hasTab(submission.id)) this._tabManager.removeTab(submission.id);
      this.queue.push(submission);

      // Sort website post order
      const websitesToPost = [];
      submission.formData.websites.forEach(website => {
        if (!websitesToPost.includes(website)) websitesToPost.push(website);
      });

      submission.formData.websites = websitesToPost;
      submission.formData.websites = submission.formData.websites.sort((a, b) => {
        const aUsesSrc = WebsiteRegistry.getConfigForRegistry(a).websiteConfig.acceptsSrcURL ? true : false;
        const bUsesSrc = WebsiteRegistry.getConfigForRegistry(b).websiteConfig.acceptsSrcURL ? true : false;

        if (!aUsesSrc && !bUsesSrc) {
          // Name based sort
          if (a < b) return -1;
          if (a > b) return 1;
          return 0;
        } else if (bUsesSrc && aUsesSrc) {
          // Name based sort
          if (a < b) return -1;
          if (a > b) return 1;
          return 0;
        } else {
          if (aUsesSrc && !bUsesSrc) return 1;
          else return -1;
        }
      });

      submission.queued = true;
      submission.postStats.originalCount = submission.formData.websites.length;
      submission.postStats.fail = [];
      submission.postStats.success = [];

      this._checkQueueForNextPost();
    }

    this._notify();
  }

  public dequeue(id: number): void {
    const index: number = this.queue.findIndex(submission => submission.id === id);
    if (index !== -1) {
      const submission = this.queue[index];
      submission.queued = false;
      submission.formData.websites = [...submission.formData.websites, ...submission.postStats.fail].sort();
      submission.formData = Object.assign({}, submission.formData);
      this.queue.splice(index, 1);
    }

    // check to see if the removed submission was the one that was posting
    if (this.posting && this.posting.id === id) {
      // Post has not occurred so it is safe
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.posting = null;
        this._checkQueueForNextPost();
      }

      // NOTE: I am not exactly 100% sure what the behavior will be for an interrupted post that is inflight to a website
    }

    this._notify();
  }

  public _notify(): void {
    this.queueSubject.next(this.queue);
  }

  // Below is code that actually deals with posting

  private _archivePostTime(website: string): void {
    store.set(`${website}-last-post-time`, Date.now());
  }

  private _getLastPostTime(website: string): number {
    return store.get(`${website}-last-post-time`) || 0;
  }

  private _checkQueueForNextPost(): void {
    if (this.queue.length) {
      if (!this.posting) {
        this._post();
      }
    } else {
      // Notify listeners that there is currently nothing (there shouldn't even be a listener at this poinst ideally)
      this.statusSubject.next({
        currentId: null
      });
    }
  }

  private _getWaitTime(website: string): number {
    let timeToWait: number = dotProp.get(WebsiteRegistry.getConfigForRegistry(website), 'websiteConfig.postWaitInterval', 0); // BUG FIX: using dotProp in case config doesn't exist (somehow)
    const timeDifference: number = Date.now() - this._getLastPostTime(website); // the time between the last post time and now
    const userSetWaitInterval: number = settingsDB.get('postInterval').value() || 0;

    if (timeDifference >= timeToWait) { // when the time since the last post is already greater than the specified wait time
      timeToWait = this.useWaitIntervalIfSet && userSetWaitInterval > 0 ? userSetWaitInterval * 60000 /* assumed to be in minutes */ : 5000;
    } else {
      const calculatedWaitTime = Math.max(Math.abs(timeDifference - timeToWait), 5000);
      timeToWait = this.useWaitIntervalIfSet && userSetWaitInterval > 0 ? userSetWaitInterval * 60000 /* assumed to be in minutes */ : calculatedWaitTime;
    }

    this.useWaitIntervalIfSet = false;

    return timeToWait;
  }

  private _post(): void {
    // Get the top submission in the queue
    const postingSubmission: Submission = this.queue[0];
    if (postingSubmission) {
      this.posting = postingSubmission;

      // Get the submission's next website to post and generate a timeout interval
      const website: string = postingSubmission.formData.websites[0];

      const waitTime: number = this._getWaitTime(website);
      this.timeout = setTimeout(function() {
        this.timeout = null;

        // Check to see the submission wasn't removed from the queue during the wait time
        if (!this.queue.length || (this.queue[0] && this.queue[0].id !== postingSubmission.id)) {
          this.posting = null;
          this._checkQueueForNextPost();
          return;
        }

        postingSubmission.formData.websites.shift(); // remove the website from the list
        postingSubmission.formData = Object.assign({}, postingSubmission.formData); // trigger DB update

        // Archive latest time of posting
        this._archivePostTime(website);

        // Once all checks have passed, actually attempt the post
        this._postManager.post(website, postingSubmission)
          .then((data: PostResult) => {
            if (data) {
              if (data.srcURL) {
                postingSubmission.postStats.sourceURLs.push(data.srcURL);
              }
            }
            postingSubmission.postStats.success.push(website);
          }).catch((err: PostResult) => { // could this every return something that isn't a PostResult?
            postingSubmission.postStats.fail.push(website);

            let error = err instanceof Error ? err : err.error;
            if (error instanceof Error) {
              error = `${error.toString()}\n${error.stack}`;
            }
            postingSubmission.postStats.errors.push(error);

            // Check to see if it was interrupted while posting
            if (!this.queue.includes(postingSubmission)) {
              postingSubmission.formData.websites = [...postingSubmission.formData.websites, website].sort();
              postingSubmission.formData = Object.assign({}, postingSubmission.formData);
            }

            if (err.msg) {
              this.snotify.error(`${website} - ${err.msg}`, `${postingSubmission.title || 'Untitled'}`, {
                timeout: 10000
              });
            }
          }).finally(() => {
            postingSubmission.postStats = Object.assign({}, postingSubmission.postStats); // force update db model
            // Check to see if the queued post still belongs in the queue
            if (!postingSubmission.formData.websites.length) {
              this.posting = null;
              this.useWaitIntervalIfSet = true;

              this._postLogger.addLog(postingSubmission);

              if (postingSubmission.postStats.fail.length) {
                this.dequeue(postingSubmission.id);
                if (settingsDB.get('clearQueueOnFailure').value()) {
                  [...this.queue].forEach((queuedItem: Submission) => this.dequeue(queuedItem.id));
                }

                this._outputNotification(postingSubmission)
                  .finally(() => {
                    if (!this.queue.length && closeAfterPost() /* global var*/) {
                      setTimeout(() => {
                        if (closeAfterPost()) {
                          window.close();
                        }
                      }, 15000); // allow enough time for db to be updated and any writers hopefully
                    }
                  });
              } else {
                postingSubmission.cleanUp();
                this.dequeue(postingSubmission.id);
                this._outputNotification(postingSubmission)
                  .finally(() => {
                    if (this._tabManager.hasTab(postingSubmission.id)) this._tabManager.removeTab(postingSubmission.id);
                    this._submissionDB.delete([postingSubmission.id])
                      .finally(() => {
                        if (!this.queue.length && closeAfterPost() /* global var*/) {
                          setTimeout(() => {
                            if (closeAfterPost()) {
                              window.close();
                            }
                          }, 15000); // allow enough time for db to be updated and any writers hopefully
                        }
                      });
                  });
              }
            }

            this.posting = null;
            this._checkQueueForNextPost();
          });
      }.bind(this), waitTime);

      this.statusSubject.next({
        currentId: postingSubmission.id,
        website,
        waiting: new Date(Date.now() + waitTime)
      });
    } else {
      this.posting = null;
      this._checkQueueForNextPost();
    }
  }

  private async _outputNotification(submission: Submission): Promise<void> {
    const failed = submission.postStats.fail.length > 0;

    try {
      const thumbnail = await this._generatedThumbnailDB.getThumbnail(submission.id, SubmissionFileType.PRIMARY_FILE);
      let icon = null;
      if (thumbnail && thumbnail.length) {
        icon = 'data:image/jpeg;base64,' + Buffer.from(await blobToUint8Array(thumbnail[0].buffer)).toString('base64');
      }

      new Notification(this._translate.instant(failed ? 'Failed' : 'Success'), {
        body: submission.title || submission.fileInfo.name,
        icon
      });

      if (failed) {
        this.snotify.error(`${submission.title} (${submission.postStats.fail.join(', ')})`, { timeout: 10000, showProgressBar: true });
      } else {
        this.snotify.success(submission.title || submission.fileInfo.name, { timeout: 4500, showProgressBar: true });
      }
    } catch (e) { /* ignore */ }

    return;
  }
}
