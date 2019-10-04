import { Component, OnInit, Host, OnDestroy } from '@angular/core';
import { PostybirbLayout } from '../../layouts/postybirb-layout/postybirb-layout.component';
import { SubmissionState } from 'src/app/database/services/submission-state.service';
import { QueueInserterService } from '../../services/queue-inserter.service';
import { Submission } from 'src/app/database/models/submission.model';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { TabManager } from '../../services/tab-manager.service';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { WebsiteRestrictionsDialog } from 'src/app/websites/components/website-restrictions-dialog/website-restrictions-dialog.component';

@Component({
  selector: 'landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css']
})
export class LandingPage implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  public queued: Submission[] = [];
  public scheduled: Submission[] = [];
  public editable: Submission[] = [];

  constructor(
    @Host() public parent: PostybirbLayout,
    public submissionState: SubmissionState,
    public queueInserter: QueueInserterService,
    private dialog: MatDialog,
    private _tabManager: TabManager,
    private _submissionDB: SubmissionDBService,
  ) { }

  ngOnInit() {
    this.subscriptions.push(this.submissionState.scheduled.subscribe(s => this.scheduled = s));
    this.subscriptions.push(this.submissionState.queued.subscribe(s => this.queued = s));
    this.subscriptions.push(this.submissionState.noPostingState.subscribe(s => this.editable = s));
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  public cancelAll(submissions: Submission[]): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Cancel All'
      }
    }).afterClosed()
      .subscribe(result => {
        if (result) {
          submissions.forEach(s => {
            this.queueInserter.dequeue(s);
            if (this._tabManager.hasTab(s.id)) {
              this._tabManager.removeTab(s.id);
            }
          });
        }
      });
  }

  public duplicate(submission: Submission): void {
    this._submissionDB.duplicate(submission.id, submission.title || 'Untitled')
      .then(() => { })
      .catch((err) => { console.error(err) })
      .finally(() => { });
  }

  public dequeueScheduled(submission: Submission): void {
    this.queueInserter.dequeue(submission);
    if (this._tabManager.hasTab(submission.id)) {
      this._tabManager.removeTab(submission.id);
    }
  }

  public edit(submission: Submission): void {
    this._tabManager.addTab(submission);
  }

  public editScheduled(submission: Submission): void {
    this._tabManager.addTab(submission, true);
  }

  public openWebsiteRules(): void {
    this.dialog.open(WebsiteRestrictionsDialog);
  }

}
