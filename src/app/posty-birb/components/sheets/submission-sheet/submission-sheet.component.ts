import { Component, Inject, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog, MAT_BOTTOM_SHEET_DATA } from '@angular/material';
import { Store } from '@ngxs/store';

import { SubmissionArchive } from '../../../../commons/models/posty-birb/posty-birb-submission';
import { SubmissionSettingsDialogComponent } from '../../dialog/submission-settings-dialog/submission-settings-dialog.component';
import { PostyBirbStateAction } from '../../../stores/states/posty-birb.state';
import { ConfirmDialogComponent } from '../../../../commons/components/confirm-dialog/confirm-dialog.component';
import { LoggerService } from '../../../../logs/services/logger/logger.service';

@Component({
  selector: 'submission-sheet',
  templateUrl: './submission-sheet.component.html',
  styleUrls: ['./submission-sheet.component.css']
})
export class SubmissionSheetComponent implements OnInit, AfterViewInit, OnDestroy {

  private submissionSubscription: Subscription = Subscription.EMPTY;

  public scheduledSubmissions: SubmissionArchive[] = [];
  public unscheduledSubmissions: SubmissionArchive[] = [];
  public queuedSubmissions: SubmissionArchive[] = [];
  public logs: any[] = [];
  public selectedIndex: number = 0;

  constructor(@Inject(MAT_BOTTOM_SHEET_DATA) private data: any, private _store: Store, private dialog: MatDialog, private _changeDetector: ChangeDetectorRef, private logger: LoggerService) { }

  ngOnInit() {
    this.selectedIndex = this.data.index || 0;
  }

  ngAfterViewInit() {
    this.submissionSubscription = this._store.select(state => state.postybirb).subscribe(submissions => {
      this.unscheduledSubmissions = [];
      this.scheduledSubmissions = [];
      this.logs = [];

      for (let i = 0; i < submissions.submissions.length; i++) {
        const s = submissions.submissions[i];
        s.meta.schedule ? this.scheduledSubmissions.push(s) : this.unscheduledSubmissions.push(s);
      }

      this.queuedSubmissions = submissions.queued;
      this.logs = submissions.logs || [];

      this._changeDetector.detectChanges();
    });
  }

  ngOnDestroy() {
    this.submissionSubscription.unsubscribe();
  }

  public isAdvertiseEnabled(): boolean {
    const enabled = db.get('globalAdvertise').value();
    return enabled === undefined ? true : enabled;
  }

  public toggleGlobalAdvertise(event: any): void {
    db.set('globalAdvertise', event.checked).write();
  }

  public openSettings(): void {
    let dialogRef = this.dialog.open(SubmissionSettingsDialogComponent, {});

    dialogRef.afterClosed().subscribe(() => {
      this._changeDetector.markForCheck();
    });
  }

  public clearAll(submissions: SubmissionArchive[] = []): void {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete All' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this._store.dispatch(submissions.map(s => new PostyBirbStateAction.DeleteSubmission(s)));
      }
    });
  }

  public dequeueAll(submissions: SubmissionArchive[] = []): void {
    this._store.dispatch(new PostyBirbStateAction.DequeueAllSubmissions());
  }

  public postAll(submissions: SubmissionArchive[] = []): void {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Post All'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this._store.dispatch(submissions.map(s => new PostyBirbStateAction.QueueSubmission(s)));
      }
    });
  }

  public emergencyStop(): void {
    location.reload();
  }

  public saveLog(log: any): void {
    this.logger.info(log.archive.meta.title, log, '', true);
  }

}
