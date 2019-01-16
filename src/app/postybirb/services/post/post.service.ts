import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';

import { SnotifyService } from 'ng-snotify';
import { SubmissionArchive, PostyBirbSubmissionModel } from '../../models/postybirb-submission-model';
import { SubmissionStatus } from '../../enums/submission-status.enum';
import { WebsiteManagerService } from '../../../commons/services/website-manager/website-manager.service';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { PostyBirbStateAction } from '../../stores/states/posty-birb.state';
import { PostReport } from '../../../commons/models/website/base-website';
import { PostStateTrackerService } from '../post-state-tracker/post-state-tracker.service';

@Injectable()
export class PostService {
  private waitMap: any = {
    [SupportedWebsites.Furaffinity]: 45000,
    [SupportedWebsites.FurryAmino]: 30000,
    [SupportedWebsites.DeviantArt]: 6000,
    [SupportedWebsites.Pixiv]: 60 * 1000 * 10
  };

  private callback: any; // callback function
  private failedPosts: string[] = [];
  private postAttempts: string[] = [];
  private postingSubmission: PostyBirbSubmissionModel;
  private postTo: string[] = [];
  private originalPostCount: number = 1;
  private responses: any[] = [];
  private stopPosting: boolean = false;
  private waiting: any; // timeout
  private postFn: any; // posting fn
  public isPosting: boolean = false;
  private waitingInterval: any; //timeout for post interval
  private submission: SubmissionArchive;

  constructor(private manager: WebsiteManagerService, private snotify: SnotifyService, private _store: Store, private _stateTracker: PostStateTrackerService) { }

  public setCompletionCallback(cb: () => void): void {
    this.callback = cb;
  }

  public _clean(): void {
    this.failedPosts = [];
    this.postingSubmission = null;
    this.postTo = [];
    this.postAttempts = [];
    this.responses = [];
    this.stopPosting = false;
    this.originalPostCount = 1;
    clearTimeout(this.waiting);
    clearTimeout(this.waitingInterval);
    this.postFn = null;
    this.isPosting = false;
    this.submission = null;
    this._stateTracker.updateState(null);
  }

  public getPercentageDone(): number {
    return (1 - this.postTo.length / this.originalPostCount) * 100;
  }

  public stopIfMatchingId(id: string): void {
    if (id === this.postingSubmission.getId()) {
      this.stop();
    }
  }

  public stop(): void {
    this.stopPosting = true;

    clearTimeout(this.waiting);
    if (this.postFn) {
      this.postFn();
    } else if (this.waitingInterval) { // no post fn set yet so just call end (e.g. skipInterval)
      clearTimeout(this.waitingInterval);
      this.waitingInterval = null;
      this._canPost(); //force call of end call
    }
  }

  private done(status: SubmissionStatus): void { // completion call
    const response = Object.assign({}, {
      status,
      remainingWebsites: [...this.postTo],
      responses: [...this.responses],
      failedWebsites: [...this.failedPosts]
    });

    const postingSubmission = this.postingSubmission;

    this._clean();
    this.callback(postingSubmission, response);
  }

  public post(submission: SubmissionArchive, waitInterval: number = 0) {
    this.postTo = submission.meta.unpostedWebsites || [];
    this.postAttempts = [];
    this.originalPostCount = this.postTo.length;
    this.submission = submission;
    this.postingSubmission = PostyBirbSubmissionModel.fromArchive(submission);

    this._updateState(null, waitInterval);
    this.isPosting = true;

    this.waitingInterval = setTimeout(this._startPosting.bind(this), waitInterval);
  }

  private _startPosting(): void {
    if (this._canPost()) {
      const website: string = this.postTo.shift();

      // try to catch any website that was somehow re-inserted (should not be possible but I am ensuring behavior)
      if (this.postAttempts.includes(website)) {
        this._startPosting();
      } else {
        this.postAttempts.push(website);
        this._updateState(website, 0);
        this._attemptToPost(website)
          .then((success) => {
            if (success) {
              if (!(success instanceof Object)) {
                success = { success };
              }
              // NOTE: Saved with dispatch in case of app reset/crash
              this._store.dispatch(new PostyBirbStateAction.UpdateWebsites(this.submission, [...this.postTo, ...this.failedPosts].sort()))
              .subscribe(() => {
                success.website = website;
                this.responses.push(success);
                this._startPosting();
              });
            } else {
              this._startPosting();
            }
          })
          .catch((err) => {
            if (err) {
              if (!(err instanceof Object)) {
                err = { err };
              }

              err.website = website;
              this.responses.push(err);
              this.failedPosts.push(website);

              if (err.notify && err.msg) {
                this.snotify.error((err.msg || '').toString(), website);
              }
            }

            this._startPosting();
          });
      }
    }
  }

  private _canPost(): boolean {
    if (this.stopPosting) { // flag manually set
      if (this.failedPosts.length) {
        this.done(SubmissionStatus.FAILED);
      } else {
        this.done(SubmissionStatus.INTERRUPTED);
      }

      return false;
    } else {
      if (this.postTo.length) { // has more to post to
        if (this.failedPosts.length && this.stopOnError()) {
          this.done(SubmissionStatus.FAILED);
          return false;
        }

        return true;
      } else { // actual completion occured
        if (this.failedPosts.length) {
          this.done(SubmissionStatus.FAILED);
        } else {
          this.done(SubmissionStatus.POSTED); // success
        }

        return false;
      }
    }
  }

  private _attemptToPost(website: string): Promise<any> {
    clearTimeout(this.waiting);
    this.waiting = null;
    this.postFn = null;
    const interval: number = this._getInterval(website);
    this._updateState(website, interval);

    return this._post(interval, website);
  }

  private _post(interval, website): Promise<PostReport> {
    return new Promise(function(resolve, reject) {
      this.postFn = function() {
        this._updateState(website, null);
        this.postFn = null; // protect from double call
        if (this.stopPosting) {
          this.postTo.push(website);
          resolve();
        } else {
          try {
            this.postingSubmission.getPreloadedSubmissionFile().then(() => {
              this.postingSubmission.getPreloadedThumbnailFile().then(() => {
                this.postingSubmission.getPreloadedAdditionalFiles().then(() => {
                  this.setLastPosted(website);
                  this.manager.post(website, this.postingSubmission)
                    .subscribe(success => {
                      this.setLastPosted(website);
                      resolve(success);
                    }, err => {
                      this.setLastPosted(website);
                      reject(err);
                    });
                })
                .catch(() => this._fileLoadError(reject, 'Could not load additional image file for submission'));
              })
              .catch(() => this._fileLoadError(reject, 'Could not load thumbnail file for submission'));
            })
            .catch(() => this._fileLoadError(reject, 'Could not load primary file for submission'));
          } catch (err) {
            reject(err);
          }
        }
      }

      this.waiting = setTimeout(this.postFn.bind(this), interval);
    }.bind(this));
  }

  private _getInterval(website: string): number {
    const now = Date.now();
    const lastPosted: number = db.get(`lastPosted${website}`).value() || 0;
    const wait: number = this.waitMap[website] || 4000;

    return lastPosted + wait <= now ? 4000 : Math.max(Math.abs(now - lastPosted - wait), 3000);
  }

  private setLastPosted(website: string): void {
    db.set(`lastPosted${website}`, Date.now()).write();
  }

  private stopOnError(): boolean {
    const enabled = db.get('stopOnFailure').value();
    return enabled === undefined ? true : enabled;
  }

  private _updateState(website: string, waitingInterval: number): void {
    this._stateTracker.updateState({
      id: this.submission.meta.id,
      percent: this.getPercentageDone(),
      currentWebsite: website,
      waitingFor: waitingInterval ? new Date(Date.now() + waitingInterval) : null
    });
  }

  private _fileLoadError(reject: any, msg: string): void {
    alert(msg);
    reject(msg);
  }

}
