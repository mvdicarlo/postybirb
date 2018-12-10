import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material';
import { Store } from '@ngxs/store';

import { WebLogo } from '../../../../../commons/enums/web-logo.enum';
import { SubmissionArchive, PostyBirbSubmissionModel } from '../../../../models/postybirb-submission-model';
import { PostyBirbStateAction } from '../../../../stores/states/posty-birb.state';
import { ConfirmDialogComponent } from '../../../../../commons/components/confirm-dialog/confirm-dialog.component';
import { ScheduleSubmissionDialogComponent } from '../../../dialog/schedule-submission-dialog/schedule-submission-dialog.component';
import { SubmissionViewComponent } from '../../../dialog/submission-view/submission-view.component';
import { SubmissionStatus } from '../../../../enums/submission-status.enum';
import { WebsiteCoordinatorService } from '../../../../../commons/services/website-coordinator/website-coordinator.service';
import { PostService } from '../../../../services/post/post.service';

@Component({
  selector: 'submission-row',
  templateUrl: './submission-row.component.html',
  styleUrls: ['./submission-row.component.css']
})
export class SubmissionRowComponent implements OnInit, OnDestroy {
  @Input() archive: SubmissionArchive;

  public submission: PostyBirbSubmissionModel;
  public submissionStatus: any = SubmissionStatus;

  public file: any;
  public fileIcon: string;
  public title: string;
  public status: string;
  public schedule: Date;

  public remainingAmount: number = 0;
  public currentlyPostingTo: string = null;
  public logo: any = null;
  public waitingUntil: Date = null;
  public postingUsername: string;
  public isPostingService: boolean = false;

  private subscription: Subscription = Subscription.EMPTY;
  private handlerSubscription: Subscription = Subscription.EMPTY;

  constructor(private _store: Store, private dialog: MatDialog, private _changeDetector: ChangeDetectorRef,
    private postService: PostService, private websiteCoordinator: WebsiteCoordinatorService, private router: Router) { }

  ngOnInit() {
    this.submission = PostyBirbSubmissionModel.fromArchive(this.archive);

    this.file = this.submission.getSubmissionFileObject();
    this.title = this.submission.title;
    this.status = this.submission.submissionStatus;
    this.schedule = this.submission.schedule;
    this.subscription = this.postService.postingIdObserver().subscribe((id: string) => {
      if (id && id === this.submission.getId()) {
        this.isPostingService = true;
        this.handlerSubscription = this.postService.subscribeToWebsiteUpdates().subscribe((website) => {
          this.currentlyPostingTo = website;
          this.logo = WebLogo[website];
          this.remainingAmount = this.postService.getPercentageDone();
          this.waitingUntil = this.postService.waitingFor;
          this._changeDetector.markForCheck();

          if (website) {
            this.websiteCoordinator.getUsername(website).then(username => {
              this.postingUsername = username;
              this._changeDetector.markForCheck();
            }).catch(() => {
              this.postingUsername = 'Unknown';
              this._changeDetector.markForCheck();
            });
          }
        });
      } else {
        this.isPostingService = false;
        this.logo = null;
        this.remainingAmount = 0;
        this.waitingUntil = null;
        this.postingUsername = null;
        this.handlerSubscription.unsubscribe();
      }

      this._changeDetector.markForCheck();
    });

    if (this.file) {
      this.submission.getSubmissionFileIcon({
        height: 100,
        width: 100
      }).then(path => {
        this.fileIcon = path;
        this._changeDetector.markForCheck();
      });
    }
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
    if (this.submission.submissionStatus !== SubmissionStatus.POSTED) {
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
    if (this.isPostingService) {
      this.postService.stop();
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
    if (this.submission.submissionStatus !== SubmissionStatus.POSTED) {
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
