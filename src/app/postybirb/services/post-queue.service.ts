import { Injectable } from '@angular/core';
import { Submission, SubmissionChange } from 'src/app/database/models/submission.model';
import { TabManager } from './tab-manager.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { PostManagerService } from './post-manager.service';
import { SnotifyService } from 'ng-snotify';
import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { GeneratedThumbnailDBService } from 'src/app/database/model-services/generated-thumbnail.service';
import { SubmissionFileType } from 'src/app/database/tables/submission-file.table';
import { TranslateService } from '@ngx-translate/core';

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
  private queuedListeners: { [key: number]: Subscription } = {};
  private posting: Submission;
  private useWaitIntervalIfSet: boolean = false;
  private timeout: any;

  private queueSubject: BehaviorSubject<Submission[]> = new BehaviorSubject([]);
  public readonly changes: Observable<Submission[]> = this.queueSubject.asObservable();

  private statusSubject: BehaviorSubject<PostQueueStatus> = new BehaviorSubject({ currentId: null });
  public readonly statusUpdates: Observable<PostQueueStatus> = this.statusSubject.asObservable();

  constructor(
    private _tabManager: TabManager,
    private _postManager: PostManagerService,
    private _submissionDB: SubmissionDBService,
    private _generatedThumbnailDB: GeneratedThumbnailDBService,
    private _translate: TranslateService,
    private snotify: SnotifyService
  ) { }

  public enqueue(submission: Submission): void {
    const index: number = this.queue.findIndex(s => s.id === submission.id);
    if (index === -1) {
      this._tabManager.removeTab(submission.id);
      this.queue.push(submission);
      submission.queued = true;
      submission.postStats.originalCount = submission.formData.websites.length;
      submission.postStats.fail = [];
      submission.postStats.success = [];

      this.queuedListeners[submission.id] = submission.changes
        .subscribe((change: SubmissionChange) => {
          if (change.queued) {
            if (!submission.queued) {
              this.dequeue(submission.id);
            }
          }
        }, () => { }, () => {
          if (this.queuedListeners[submission.id]) {
            this.queuedListeners[submission.id].unsubscribe();
            delete this.queuedListeners[submission.id];
          }
        });

      this._checkQueueForNextPost();
    }

    this._notify();
  }

  public dequeue(id: number): void {
    if (this.queuedListeners[id]) {
      this.queuedListeners[id].unsubscribe();
      delete this.queuedListeners[id];
    }

    const index: number = this.queue.findIndex(submission => submission.id === id);
    if (index !== -1) {
      this.queue[index].queued = false;
      this.queue[index].formData.websites = [...this.queue[index].formData.websites, ...this.queue[index].postStats.fail].sort();
      this.queue[index].formData = Object.assign({}, this.queue[index].formData);
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

  private _notify(): void {
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
    let timeToWait: number = WebsiteRegistry.getConfigForRegistry(website).websiteConfig.postWaitInterval || 0;
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
          .then((data) => {
            if (data) {
              if (data.srcURL) {
                postingSubmission.postStats.sourceURLs.push(data.srcURL);
              }
            }
            postingSubmission.postStats.success.push(website);
          }).catch((err) => {
            postingSubmission.postStats.fail.push(website);
            postingSubmission.postStats.errors.push(err.error);

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
            // Check to see if the queued post still belongs in the queue
            if (!postingSubmission.formData.websites.length) {
              this.posting = null;

              this.dequeue(postingSubmission.id);
              this.useWaitIntervalIfSet = true;

              if (postingSubmission.postStats.fail.length) {
                if (settingsDB.get('clearQueueOnFailure').value()) {
                  [...this.queue].forEach((queuedItem: Submission) => this.dequeue(queuedItem.id));
                }
              } else {
                postingSubmission.cleanUp();
                this._outputNotification(postingSubmission)
                  .finally(() => {
                    // this._submissionDB.delete([this.submission.id]);
                  });
              }
            }

            // TODO log errors

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

  private _outputNotification(submission: Submission): Promise<void> {
    return new Promise((resolve) => {
      const failed = submission.postStats.fail.length > 0;

      this._generatedThumbnailDB.getThumbnail(submission.id, SubmissionFileType.PRIMARY_FILE)
        .then(thumbnail => {
          this._translate.get(failed ? 'Failed' : 'Success', ).subscribe((msg) => {
            new Notification(msg, {
              body: submission.title,
              icon: 'data:image/jpeg;base64,' + Buffer.from((thumbnail[0] || <any>{}).buffer).toString('base64')
            });

            failed ? this.snotify.error(`${submission.title} (${submission.postStats.fail.join(', ')})`, { timeout: 30000, showProgressBar: true })
              : this.snotify.success(submission.title, { timeout: 10000, showProgressBar: true });
          })
        }).finally(() => resolve())
    });
  }
}
