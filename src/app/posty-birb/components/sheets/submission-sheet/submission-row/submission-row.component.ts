import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material';
import { Store } from '@ngxs/store';

import { WebLogo } from '../../../../../commons/enums/web-logo.enum';
import { SubmissionArchive, PostyBirbSubmission } from '../../../../../commons/models/posty-birb/posty-birb-submission';
import { PostyBirbStateAction } from '../../../../stores/states/posty-birb.state';
import { ConfirmDialogComponent } from '../../../../../commons/components/confirm-dialog/confirm-dialog.component';
import { ScheduleSubmissionDialogComponent } from '../../../dialog/schedule-submission-dialog/schedule-submission-dialog.component';
import { SubmissionViewComponent } from '../../../dialog/submission-view/submission-view.component';
import { SubmissionStatus } from '../../../../enums/submission-status.enum';
import { PostManagerService, PostHandler } from '../../../../services/post-manager/post-manager.service';

@Component({
  selector: 'submission-row',
  templateUrl: './submission-row.component.html',
  styleUrls: ['./submission-row.component.css']
})
export class SubmissionRowComponent implements OnInit, OnDestroy {
  @Input() archive: SubmissionArchive;
  @Input() reorder: boolean = false;

  public submission: PostyBirbSubmission;
  public submissionStatus: any = SubmissionStatus;

  public file: any;
  public fileIcon: string;
  public src: string;
  public title: string;
  public status: string;
  public schedule: Date;

  public remainingAmount: number = 0;
  public currentlyPostingTo: string = null;
  public logo: any = null;
  public waitingUntil: Date = null;

  private subscription: Subscription = Subscription.EMPTY;
  private handlerSubscription: Subscription = Subscription.EMPTY;
  private handler: PostHandler = null;

  constructor(private _store: Store, private dialog: MatDialog, private _changeDetector: ChangeDetectorRef, private postManager: PostManagerService, private router: Router) { }

  ngOnInit() {
    this.submission = PostyBirbSubmission.fromArchive(this.archive);

    this.file = this.submission.getSubmissionFileObject();
    this.title = this.submission.getTitle();
    this.status = this.submission.getSubmissionStatus();
    this.schedule = this.submission.getSchedule();
    this.submission.getSubmissionFileSource().then(src => {
      this.src = src || '';
      this.subscription = this.postManager.asObservable().subscribe((handler: PostHandler) => {
        if (handler && handler.getId() === this.submission.getId()) {
          this.handler = handler;
          this.handlerSubscription = handler.subscribeToWebsiteUpdates().subscribe((website) => {
            this.currentlyPostingTo = website;
            this.logo = WebLogo[website];
            this.remainingAmount = this.handler.getPercentageDone();
            this.waitingUntil = this.handler.waitingFor;
            this._changeDetector.detectChanges();
          });
        } else {
          this.handler = null;
          this.logo = null;
          this.remainingAmount = 0;
          this.waitingUntil = null;
          this.handlerSubscription.unsubscribe();
        }

        this._changeDetector.detectChanges();
      });
    });

    getFileIcon(this.file.path, (err, icon) => {
      this.fileIcon = 'data:image/jpeg;base64, ' + icon.toJPEG(100).toString('base64');
      this._changeDetector.markForCheck();
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.handlerSubscription.unsubscribe();
  }

  public deleteItem(): void {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this._store.dispatch(new PostyBirbStateAction.DeleteSubmission(this.archive));
      }
    });
  }

  public editItem(): void {
    this._store.dispatch(new PostyBirbStateAction.EditSubmission(this.archive, false));
    this.router.navigate(['/postybirb'], { skipLocationChange: true });
  }

  public copyItem(): void {
    this._store.dispatch(new PostyBirbStateAction.EditSubmission(this.archive, true));
    this.router.navigate(['/postybirb'], { skipLocationChange: true });
  }

  public postItem(): void {
    if (this.submission.getSubmissionStatus() !== SubmissionStatus.POSTED) {
      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: { title: 'Post' }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this._store.dispatch(new PostyBirbStateAction.QueueSubmission(this.archive));
        }
      });
    }
  }

  public cancelPosting(): void {
    if (this.handler) {
      this.handler.stop();
    } else {
      this._store.dispatch(new PostyBirbStateAction.DequeueSubmission(this.archive));
    }
  }

  public openSummary(): void {
    this.dialog.open(SubmissionViewComponent, {
      data: this.submission,
      width: '80%'
    });
  }

  public scheduleItem(): void {
    if (this.submission.getSubmissionStatus() !== SubmissionStatus.POSTED) {
      let dialogRef: MatDialogRef<ScheduleSubmissionDialogComponent>;
      dialogRef = this.dialog.open(ScheduleSubmissionDialogComponent, {
        data: this.submission
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this._store.dispatch(new PostyBirbStateAction.AddSubmission(result.asSubmissionArchive(), true))
        }
      });
    }
  }

  public moveUp(): void {
    this.archive.meta.order -= 1.1;
    this._store.dispatch(new PostyBirbStateAction.ReorderSubmission(this.archive));
  }

  public moveDown(): void {
    this.archive.meta.order += 1.1;
    this._store.dispatch(new PostyBirbStateAction.ReorderSubmission(this.archive));
  }

  public isQueued(): boolean {
    return this.archive.meta.submissionStatus === SubmissionStatus.QUEUED;
  }

  public isPosting(): boolean {
    return this.archive.meta.submissionStatus === SubmissionStatus.POSTING;
  }

  public isIdle(): boolean {
    const status: SubmissionStatus = this.archive.meta.submissionStatus;
    return status === SubmissionStatus.UNPOSTED || status === SubmissionStatus.FAILED || status === SubmissionStatus.INTERRUPTED || status === SubmissionStatus.POSTED;
  }

  public getMode(): string {
    if (this.isQueued()) return 'buffer';
    if (this.isPosting()) return 'determinate';
  }

}
