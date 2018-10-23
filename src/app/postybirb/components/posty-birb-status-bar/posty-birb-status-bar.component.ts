import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material';
import { MatBottomSheet } from '@angular/material';
import { Subscription } from 'rxjs';
import { Store } from '@ngxs/store';

import { SubmissionSheetComponent } from '../sheets/submission-sheet/submission-sheet.component';
import { SubmissionSettingsDialogComponent } from '../dialog/submission-settings-dialog/submission-settings-dialog.component';
import { ManageTemplatesDialogComponent } from '../dialog/manage-templates-dialog/manage-templates-dialog.component';

@Component({
  selector: 'postybirb-status-bar',
  templateUrl: './posty-birb-status-bar.component.html',
  styleUrls: ['./posty-birb-status-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostyBirbStatusBarComponent implements OnInit, OnDestroy {

  private queueSubscription: Subscription = Subscription.EMPTY;
  private submissionSubscription: Subscription = Subscription.EMPTY;

  public queueCount: number = 0;
  public submissionCount: number = 0;

  constructor(private _store: Store, private bottomSheet: MatBottomSheet, private dialog: MatDialog, private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this.submissionSubscription = this._store.select(state => state.postybirb.submissions).subscribe(submissions => {
      this.submissionCount = submissions.length;
      this._changeDetector.markForCheck();
    });

    this.queueSubscription = this._store.select(state => state.postybirb.queued).subscribe(submissions => {
      this.queueCount = submissions.length
      this._changeDetector.markForCheck();
    });
  }

  ngOnDestroy() {
    this.queueSubscription.unsubscribe();
    this.submissionSubscription.unsubscribe();
  }

  public async openQueue() {
    this.bottomSheet.open(SubmissionSheetComponent, {
      data: { index: 2 }
    });
  }

  public async openSubmissions() {
    this.bottomSheet.open(SubmissionSheetComponent, {
      data: { index: 0 }
    });
  }

  public async openSettings() {
    this.dialog.open(SubmissionSettingsDialogComponent);
  }

  public async openTemplateManager() {
    this.dialog.open(ManageTemplatesDialogComponent, { width: '50%' });
  }

}
