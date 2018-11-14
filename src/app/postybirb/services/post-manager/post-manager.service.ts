import { Injectable } from '@angular/core';
import { Subscription, Observable, BehaviorSubject, Subscriber } from 'rxjs';
import { Store } from '@ngxs/store';

import { SnotifyService } from 'ng-snotify';

import { WebsiteManagerService } from '../../../commons/services/website-manager/website-manager.service';
import { SubmissionArchive, PostyBirbSubmissionModel } from '../../models/postybirb-submission-model';
import { PostyBirbSubmissionData } from '../../../commons/interfaces/posty-birb-submission-data.interface';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { SubmissionStatus } from '../../enums/submission-status.enum';
import { PostyBirbStateAction } from '../../stores/states/posty-birb.state';

import { LoggerService } from '../../../logs/services/logger/logger.service';
import { LogName } from '../../../logs/enums/log-name.enum';

@Injectable({
  providedIn: 'root'
})
export class PostManagerService {

  private queueSubscription: Subscription = Subscription.EMPTY;
  private postingSubscription: Subscription = Subscription.EMPTY;
  private postingSubject: BehaviorSubject<PostHandler> = new BehaviorSubject(undefined);

  private queuedSubmissions: SubmissionArchive[] = [];
  private postingSubmission: PostHandler = null;

  constructor(private _store: Store, private websiteManager: WebsiteManagerService, private logger: LoggerService, private snotify: SnotifyService) {
    this.queueSubscription = _store.select(state => state.postybirb.queued).subscribe((queued: SubmissionArchive[]) => {
      this.queuedSubmissions = [...queued];
      if (!this.postingSubmission) {
        this.beginNextPost();
      } else {
        let found: boolean = false;
        for (let i = 0; i < queued.length; i++) {
          const s = queued[i];
          if (s.meta.id === this.postingSubmission.getId()) {
            found = true;
            break;
          }
        }

        if (!found) {
          this.postingSubmission.stop();
        }
      }
    });
  }

  public asObservable(): any {
    return this.postingSubject.asObservable();
  }

  private stopOnError(): boolean {
    const enabled = db.get('stopOnFailure').value();
    return enabled === undefined ? true : enabled;
  }

  private beginNextPost(skipInterval: boolean = true): void {
    if (this.queuedSubmissions.length > 0) {
      const submission = this.queuedSubmissions.shift();
      submission.meta.submissionStatus = SubmissionStatus.POSTING;
      this._store.dispatch(new PostyBirbStateAction.AddSubmission(submission, true));
      this.postingSubmission = new PostHandler(this.websiteManager, submission, this.logger, this.snotify);

      const interval = Number(db.get('postInterval').value() || 0);
      if (interval && !skipInterval) {
        this.postingSubmission.setWaitingFor(interval * 60000);
        setTimeout(function() {
          this.startPost();
        }.bind(this), interval * 60000);
      } else {
        this.startPost()
      }

      this.postingSubject.next(this.postingSubmission);
    }
  }

  private startPost(): void {
    this.postingSubscription = this.postingSubmission.start().subscribe((success) => {
      // Nothing to do here I think
    }, (err) => {
      // Don't want to use this due to stop on error
    }, () => {
      const submission: PostyBirbSubmissionModel = this.postingSubmission.getSubmission();

      this._store.dispatch(new PostyBirbStateAction.LogSubmissionPost(submission, this.postingSubmission.getResponses()));

      if (this.postingSubmission.isStopped()) {
        this._store.dispatch(new PostyBirbStateAction.DequeueSubmission(submission.asSubmissionArchive(), true));
      } else {
        this._store.dispatch(new PostyBirbStateAction.CompleteSubmission(submission));
      }

      if (submission.submissionStatus === SubmissionStatus.FAILED && this.stopOnError()) {
        this._store.dispatch(new PostyBirbStateAction.DequeueAllSubmissions());
      }

      this.postingSubmission.destroy();

      this.postingSubscription.unsubscribe();
      this.postingSubmission = null;
      this.postingSubject.next(undefined);

      this.beginNextPost(false);
    });
  }
}

export class PostHandler {

  private currentlyPostingTo: BehaviorSubject<string> = new BehaviorSubject(undefined);
  private submission: PostyBirbSubmissionModel = null;
  private _stop: boolean = false;
  private unpostedWebsites: string[] = [];
  private originalPostCount: number = 0;
  private observer: Subscriber<any> = null;
  private timer: any = null;
  private failed: string[] = [];
  private responses: any[] = [];

  public waitingFor: Date = null;

  private waitMap: any = {
    [SupportedWebsites.Furaffinity]: 20500,
    [SupportedWebsites.FurryAmino]: 30000,
    [SupportedWebsites.DeviantArt]: 6000,
    [SupportedWebsites.Pixiv]: 60 * 1000 * 10
  };

  constructor(private manager: WebsiteManagerService, private archive: SubmissionArchive, private logger: LoggerService, private snotify: SnotifyService) {
    this.submission = PostyBirbSubmissionModel.fromArchive(archive);
    this.unpostedWebsites = [...this.submission.unpostedWebsites].sort();
    this.originalPostCount = this.unpostedWebsites.length;
  }

  public getId(): any {
    return this.archive.meta.id;
  }

  public start(): Observable<any> {
    return new Observable<any>(observer => {
      this.observer = observer;
      try {
        this.submission.getPreloadedSubmissionFile().then(() => {
          this.submission.getPreloadedThumbnailFile().then(() => {
            this.submission.getPreloadedAdditionalFiles().then(() => {
              this.scheduleNextAttempt();
            });
          });
        });
      } catch (err) {
        observer.complete();
      }
    });
  }

  public stop(): void {
    this._stop = true;
    clearTimeout(this.timer);
    if (this.observer) this.observer.complete();
  }

  public setWaitingFor(interval: number): void {
    this.waitingFor = new Date(Date.now() + interval);
    this.currentlyPostingTo.next('');
  }

  private attemptPost(website: string): void {
    if (this.isStopped()) {
      this.observer.complete();
      return;
    }

    this.manager.post(website, this.submission).subscribe((res) => {
      this.responses.push({ website, res });
      if (this.isStopped()) {
        this.observer.complete();
      } else {
        this.setLastPosted(website);
        this.scheduleNextAttempt();
      }
    }, (err) => {
      err = err || {};
      this.responses.push({ website, err });
      err.website = website;
      this.websiteFailed(err);
    });
  }

  private scheduleNextAttempt(): void {
    const website: string = this.unpostedWebsites.shift();

    if (website) {
      const waitTime: number = this.generateTimeout(website);
      this.timer = setTimeout(this.attemptPost.bind(this), waitTime, website);

      if (waitTime < 60000) {
        this.waitingFor = null;
      } else {
        this.waitingFor = new Date(Date.now() + waitTime);
      }

      this.currentlyPostingTo.next(website);
    } else {
      // Done (no more websites)
      this.observer.complete();
    }
  }

  private generateTimeout(website: string): number {
    const now = Date.now();
    const lastPosted: number = db.get(`lastPosted${website}`).value() || 0;
    const wait: number = this.waitMap[website] || 3000;

    return lastPosted + wait <= now ? 100 : Math.abs(now - lastPosted - wait);
  }

  private setLastPosted(website): void {
    db.set(`lastPosted${website}`, Date.now()).write();
  }

  private websiteFailed(err: any): void {
    this.failed.push(err.website);
    if (err.notify && err.msg) {
      this.snotify.error((err.msg || '').toString(), err.website);
    }

    this.log(err);

    if (this.stopOnError() || this.isStopped()) {
      this.observer.complete();
    } else {
      this.setLastPosted(err.website);
      this.scheduleNextAttempt();
    }
  }

  private log(err: any): void {
    if (err.submission) {
      const sub: PostyBirbSubmissionData = Object.assign({}, err.submission);
      sub.submissionData = Object.assign({}, err.submission.submissionData);
      sub.submissionData = Object.assign({}, err.submission.submissionData);
      sub.submissionData.submissionFile = null;
      sub.submissionData.thumbnailFile = null;
      err.submission = sub;
    }

    if (this.generateLogs() && !err.skipLog) {
      this.logger.error(LogName.PB_REPORT_LOG, err, 'Post Failed For ' + err.website, true);
    }
  }

  private stopOnError(): boolean {
    const enabled = db.get('stopOnFailure').value();
    return enabled === undefined ? true : enabled;
  }

  private generateLogs(): boolean {
    const enabled = db.get('generateLogOnFailure').value();
    return enabled === undefined ? false : enabled;
  }

  public getResponses(): any[] {
    return this.responses;
  }

  public getSubmission(): PostyBirbSubmissionModel {
    this.submission.unpostedWebsites = [...this.failed, ...this.unpostedWebsites].sort();
    this.submission.submissionStatus = this.failed.length > 0 ? SubmissionStatus.FAILED : SubmissionStatus.POSTED;
    return this.submission;
  }

  public isStopped(): boolean {
    return this._stop;
  }

  public getPercentageDone(): number {
    return (1 - this.unpostedWebsites.length / this.originalPostCount) * 100;
  }

  public subscribeToWebsiteUpdates(): Observable<string> {
    return this.currentlyPostingTo.asObservable();
  }

  public destroy(): void {
    this.currentlyPostingTo.complete();
  }

}
