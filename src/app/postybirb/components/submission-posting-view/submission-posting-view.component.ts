import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Submission } from 'src/app/database/models/submission.model';
import { PostQueueService } from '../../services/post-queue.service';
import { Subscription } from 'rxjs';
import { QueueInserterService } from '../../services/queue-inserter.service';

@Component({
  selector: 'submission-posting-view',
  templateUrl: './submission-posting-view.component.html',
  styleUrls: ['./submission-posting-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubmissionPostingViewComponent implements OnInit, OnDestroy {
  @Input() submission: Submission;
  private queueListener: Subscription = Subscription.EMPTY;

  public wait: Date;
  public postingWebsite: string;

  constructor(private _postQueue: PostQueueService, private _queueInserter: QueueInserterService, private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this.queueListener = this._postQueue.statusUpdates.subscribe(update => {
      if (update.currentId === this.submission.id) {
        this.postingWebsite = update.website;
        this.wait = update.waiting;
      } else {
        this.wait = null;
        this.postingWebsite = null;
      }

      this._changeDetector.markForCheck();
    });
  }

  ngOnDestroy() {
    this.queueListener.unsubscribe();
  }

  public cancel(): void {
    this._queueInserter.dequeue(this.submission);
  }

  public getProgress(): number {
    return Math.floor(((this.submission.postStats.success.length + this.submission.postStats.fail.length) / this.submission.postStats.originalCount) * 100);
  }

}
