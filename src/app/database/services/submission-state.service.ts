import { Injectable } from '@angular/core';
import { Submission } from '../models/submission.model';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { map, debounceTime, shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SubmissionState {
  private submissionList: Submission[] = [];
  private changeSubscriptions: { [key: string]: Subscription } = {};

  private submissionsPublisher: BehaviorSubject<Submission[]> = new BehaviorSubject<Submission[]>([]);

  public readonly onSubmissionPublish: Observable<Submission[]> = this.submissionsPublisher.asObservable();

  public readonly scheduled: Observable<Submission[]> = this.onSubmissionPublish
    .pipe(map(s => s.filter(_s => _s.isScheduled)
    .sort((a, b) => {
      const aDate = new Date(a.schedule);
      const bDate = new Date(b.schedule);

      if (aDate < bDate) return -1;
      if (aDate > bDate) return 1;
      return 0;
    })), shareReplay(1));

  public readonly queued: Observable<Submission[]> = this.submissionsPublisher
    .pipe(map(s => s.filter(_s => _s.queued)), shareReplay(1));

  public readonly noPostingState: Observable<Submission[]> = this.onSubmissionPublish
    .pipe(map(s => s.filter(_s => !_s.isScheduled).filter(_s => !_s.queued)), shareReplay(1));

  public append(submission: Submission): void {
    if (!this.submissionList.find(s => submission.id === s.id)) {
      this.submissionList.push(submission);
      this.changeSubscriptions[submission.id] = submission.changes
        .pipe(debounceTime(250))
        .subscribe(
          this._notify.bind(this),
          () => { },
          this.remove.bind(this, submission.id)
        );

        this._notify();
    }
  }

  public remove(id: number): void {
    if (this.changeSubscriptions[id]) {
      this.changeSubscriptions[id].unsubscribe();
      delete this.changeSubscriptions[id];
    }

    const index: number = this.submissionList.findIndex(s => id === s.id);
    if (index !== -1) this.submissionList.splice(index, 1);

    this._notify();
  }

  private _notify(): void {
    this.submissionsPublisher.next([...this.submissionList]);
  }
}
