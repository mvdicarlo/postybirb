import { Injectable } from '@angular/core';
import { Submission, SubmissionChange } from 'src/app/database/models/submission.model';
import { TabManager } from './tab-manager.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PostQueueService {
  private queue: Submission[] = [];
  private queuedListeners: { [key: number]: Subscription } = {};

  private queueSubject: BehaviorSubject<Submission[]> = new BehaviorSubject([]);
  public readonly changes: Observable<Submission[]> = this.queueSubject.asObservable();

  constructor(
    private _tabManager: TabManager,
  ) { }

  public enqueue(submission: Submission): void {
    const index: number = this.queue.findIndex(s => s.id === submission.id);
    if (index === -1) {
      this._tabManager.removeTab(submission.id);
      this.queue.push(submission);
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
      this.queue.splice(index, 1);
    }

    this._notify();
  }

  private _notify(): void {
    this.queueSubject.next(this.queue);
  }
}
