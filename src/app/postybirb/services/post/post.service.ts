import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Store } from '@ngxs/store';

import { SnotifyService } from 'ng-snotify';
import { SubmissionArchive, PostyBirbSubmissionModel } from '../../models/postybirb-submission-model';
import { SubmissionStatus } from '../../enums/submission-status.enum';
import { WebsiteManagerService } from '../../../commons/services/website-manager/website-manager.service';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { PostyBirbStateAction } from '../../stores/states/posty-birb.state';

@Injectable()
export class PostService {
  private waitMap: any = {
    [SupportedWebsites.Furaffinity]: 30000,
    [SupportedWebsites.FurryAmino]: 30000,
    [SupportedWebsites.DeviantArt]: 6000,
    [SupportedWebsites.Pixiv]: 60 * 1000 * 10
  };

  private callback: any; // callback function
  private currentlyPostingTo: BehaviorSubject<string> = new BehaviorSubject(undefined);
  private postingSubmissionId: BehaviorSubject<string> = new BehaviorSubject(undefined);
  private failedPosts: string[] = [];
  private postingSubmission: PostyBirbSubmissionModel;
  private postTo: string[] = [];
  private originalPostCount: number = 1;
  private responses: any[] = [];
  private stopPosting: boolean = false;
  public waitingFor: Date;
  private waiting: any; // timeout
  private postFn: any; // posting fn
  public isPosting: boolean = false;
  private waitingInterval: any; //timeout for post interval
  private submission: SubmissionArchive;

  constructor(private manager: WebsiteManagerService, private snotify: SnotifyService, private _store: Store) { }

  public _clean(): void {
    this.callback = null;
    this.currentlyPostingTo.next(undefined);
    this.failedPosts = [];
    this.postingSubmission = null;
    this.postTo = [];
    this.responses = [];
    this.waitingFor = null;
    this.stopPosting = false;
    this.originalPostCount = 1;
    clearTimeout(this.waiting);
    clearTimeout(this.waitingInterval);
    this.postFn = null;
    this.isPosting = false;
    this.submission = null;
  }

  public subscribeToWebsiteUpdates(): Observable<string> {
    return this.currentlyPostingTo.asObservable();
  }

  public getPercentageDone(): number {
    return (1 - this.postTo.length / this.originalPostCount) * 100;
  }

  public postingIdObserver(): Observable<string> {
    return this.postingSubmissionId.asObservable();
  }

  public setWaitingFor(interval: number, website?: string): void {
    this.waitingFor = interval ? new Date(Date.now() + interval) : null;
    this.currentlyPostingTo.next(website || '');
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
    } else if (this.waitingInterval) {
      clearTimeout(this.waitingInterval);
      this.waitingInterval = null;
      this._canPost(); //force call of end call
    }
  }

  private done(status: SubmissionStatus): void { // completion call
    this.isPosting = false;
    this.callback(this.postingSubmission, {
      status,
      remainingWebsites: this.postTo,
      responses: this.responses,
      failedWebsites: this.failedPosts
    });

  }

  public post(submission: SubmissionArchive, callback: any, waitInterval: number = 0) {
    this._clean();
    this.postTo = submission.meta.unpostedWebsites || [];
    this.originalPostCount = this.postTo.length;
    this.submission = submission;
    this.postingSubmission = PostyBirbSubmissionModel.fromArchive(submission);
    this.callback = callback;

    this.setWaitingFor(waitInterval);
    this.postingSubmissionId.next(submission.meta.id);
    this.isPosting = true;

    this.waitingInterval = setTimeout(this._startPosting.bind(this), waitInterval);
  }

  private _startPosting(): void {
    if (this._canPost()) {
      const website: string = this.postTo.shift();
      this.currentlyPostingTo.next(website);
      this._attemptToPost(website)
        .then((success) => {
          if (success) {
            // NOTE: Saved with dispatch in case of app reset/crash
            this._store.dispatch(new PostyBirbStateAction.UpdateWebsites(this.submission, [...this.postTo, ...this.failedPosts].sort()));
            this.responses.push({ website, success });
          }

          this._startPosting();
        })
        .catch((err) => {
          if (err) {
            this.responses.push({ website, err });
            this.failedPosts.push(website);

            if (err.notify && err.msg) {
              this.snotify.error((err.msg || '').toString(), website);
            }
          }

          this._startPosting();
        });
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
    this.waiting = null;
    this.postFn = null;
    const interval: number = this._getInterval(website);
    if (interval >= 30000) {
      this.setWaitingFor(interval, website);
    } else {
      this.setWaitingFor(null, website);
    }

    return this._post(interval, website);
  }

  private _post(interval, website): Promise<any> {
    return new Promise(function(resolve, reject) {
      this.postFn = function() {
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
                });
              });
            });
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

    return lastPosted + wait <= now ? 3000 : Math.max(Math.abs(now - lastPosted - wait), 3000);
  }

  private setLastPosted(website: string): void {
    db.set(`lastPosted${website}`, Date.now()).write();
  }

  private stopOnError(): boolean {
    const enabled = db.get('stopOnFailure').value();
    return enabled === undefined ? true : enabled;
  }

}
