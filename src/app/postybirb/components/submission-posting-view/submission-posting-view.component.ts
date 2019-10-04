import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Submission } from 'src/app/database/models/submission.model';
import { PostQueueService } from '../../services/post-queue.service';
import { Subscription } from 'rxjs';
import { QueueInserterService } from '../../services/queue-inserter.service';
import { SubmissionPreviewDialog } from '../submission-preview-dialog/submission-preview-dialog.component';
import { MatDialog } from '@angular/material';
import { TabManager } from '../../services/tab-manager.service';

@Component({
  selector: 'submission-posting-view',
  templateUrl: './submission-posting-view.component.html',
  styleUrls: ['./submission-posting-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubmissionPostingViewComponent implements OnInit, OnDestroy {
  @Input() submission: Submission;
  private queueListener: Subscription = Subscription.EMPTY;
  private submissionChangeListener = Subscription.EMPTY;

  public wait: Date;
  public postingWebsite: string;

  constructor(
    private _postQueue: PostQueueService,
    private _queueInserter: QueueInserterService,
    private _changeDetector: ChangeDetectorRef,
    private dialog: MatDialog,
    private _tabManager: TabManager) { }

  ngOnInit() {
    this.submissionChangeListener = this.submission.changes.subscribe(change => {
      if (change.title) this._changeDetector.markForCheck();
    });

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
    this.submissionChangeListener.unsubscribe();
    this.queueListener.unsubscribe();
  }

  public cancel(): void {
    this._queueInserter.dequeue(this.submission);
    if (this._tabManager.hasTab(this.submission.id)) {
      this._tabManager.removeTab(this.submission.id);
    }
  }

  public getProgress(): number {
    return Math.floor(((this.submission.postStats.success.length + this.submission.postStats.fail.length) / this.submission.postStats.originalCount) * 100);
  }

  public preview(): void {
    this.dialog.open(SubmissionPreviewDialog, {
      data: this.submission
    });
  }

  public edit(): void {
    this._tabManager.addTab(this.submission, true);
  }

}
