import { Component, Inject, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog, MAT_BOTTOM_SHEET_DATA } from '@angular/material';
import { Store } from '@ngxs/store';

import { SubmissionArchive } from '../../../models/postybirb-submission-model';
import { SubmissionSettingsDialogComponent } from '../../dialog/submission-settings-dialog/submission-settings-dialog.component';
import { PostyBirbStateAction } from '../../../stores/states/posty-birb.state';
import { ConfirmDialogComponent } from '../../../../commons/components/confirm-dialog/confirm-dialog.component';
import { LoggerService } from '../../../../logs/services/logger/logger.service';
import { saveAs } from 'file-saver';
import { SubmissionStatus } from '../../../enums/submission-status.enum';
import { PostService } from '../../../services/post/post.service';
import { PostyBirbQueueStateAction } from '../../../stores/states/posty-birb-queue.state';

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

  constructor(@Inject(MAT_BOTTOM_SHEET_DATA) private data: any, private _store: Store,
  private dialog: MatDialog, private _changeDetector: ChangeDetectorRef,
  private logger: LoggerService, private postService: PostService) { }

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

      this.queuedSubmissions = submissions.submissions.filter(s => (s.meta.submissionStatus === SubmissionStatus.POSTING || s.meta.submissionStatus === SubmissionStatus.QUEUED));
      this.logs = logdb.get('logs').value() || [];

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
        this._store.dispatch(submissions.filter(s => s.meta.submissionStatus !== SubmissionStatus.POSTING)
        .map(s => new PostyBirbStateAction.DeleteSubmission(s)));
      }
    });
  }

  public dequeueAll(submissions: SubmissionArchive[] = []): void {
    this._store.dispatch(new PostyBirbQueueStateAction.DequeueAllSubmissions());
    this.postService.stop();
  }

  public postAll(submissions: SubmissionArchive[] = []): void {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Post All'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this._store.dispatch(submissions.map(s => new PostyBirbQueueStateAction.EnqueueSubmission(s)));
      }
    });
  }

  public emergencyStop(): void {
    location.reload();
  }

  public async saveLog(log: any) {
    this.logger.info(log.archive.meta.title, log, '', true);
  }

  public async exportConfig() {
    const config = JSON.stringify(db.getState(), null, 1);
    const blob = new Blob([config], { type: "text/plain;charset=utf-8" });
    let name = null;
    try {
      const partition = getPartition();
      if (partition) {
        name = partition.split(':')[1] + '.json';
      }
    } catch (e) {}

    saveAs(blob, name || 'postybirb.json')
  }

}
