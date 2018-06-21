import { Component, OnInit, Inject, ViewChildren, QueryList, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MatDialog, MAT_DIALOG_DATA } from '@angular/material';
import { ConfirmDialogComponent } from '../../../../commons/components/confirm-dialog/confirm-dialog.component';
import { PostService } from '../../../services/post/post.service';
import { PostyBirbSubmission } from '../../../../commons/models/posty-birb/posty-birb-submission';
import { SubmitStatusComponent } from './submit-status/submit-status.component';

@Component({
  selector: 'post-dialog',
  templateUrl: './post-dialog.component.html',
  styleUrls: ['./post-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostDialogComponent implements OnInit {
  public submissionData: PostyBirbSubmission;
  public stop: boolean;
  public stopOnFailure: boolean;
  public percentDone: number;
  public totalCompleted: number;
  public selectedWebsites = [];

  public description: string;
  public tags: string[];
  public title: string;
  public submissionType: string;
  public submissionRating: string;
  public file: any;

  private hasFailure: boolean;
  private failedWebsitePosts: string[];
  private submitCount: number;
  private stopDialog: any;
  private completeCallback: any;

  @ViewChildren(SubmitStatusComponent) statuses: QueryList<SubmitStatusComponent>;

  constructor(@Inject(MAT_DIALOG_DATA) private data: any, private postService: PostService,
    private dialog: MatDialog, public dialogRef: MatDialogRef<PostDialogComponent>,
    private _changeDetector: ChangeDetectorRef) {
    this.stopOnFailure = false;

    this.completeCallback = data.callback;
  }

  ngOnInit() {
    this.stop = false;
    this.hasFailure = false;
    this.failedWebsitePosts = [];
    this.submitCount = 0;
    this.percentDone = 0;
    this.totalCompleted = 0;

    this.submissionData = this.data.submissionItem;
    this.next(this.submissionData);
  }

  public next(submission: PostyBirbSubmission): void {
    this.submissionData = submission;
    if (!submission) {
      this.close();
    } else {
      // Load the file data so it is correct for posting
      const selectedWebsites = this.submissionData.getUnpostedWebsites();
      if (selectedWebsites && selectedWebsites.length === 0) {
        this.complete();
      } else {
        this.getFields(this.submissionData).then(() => {
          this.selectedWebsites = selectedWebsites;
          this.check();
        });
      }
    }
  }

  public getFields(submission: PostyBirbSubmission): Promise<any> {
    return new Promise((resolve) => {
      submission.getPreloadedSubmissionFile().then(src => {
        this.file = src;
        submission.getPreloadedThumbnailFile().then(() => {
          this.submissionType = submission.getSubmissionType();
          this.submissionRating = submission.getSubmissionRating();
          this.title = submission.getTitle();
          this.description = (submission.getDefaultFieldFor('defaultDescription') || {}).description || '';
          this.tags = (submission.getDefaultFieldFor('defaultTags') || {}).tags || [];
          this.check();
          submission.getPreloadedAdditionalFiles().then(() => {
            resolve();
          });
          this.check();
        });
      });
    });
  }

  public stopPosting(): void {
    this.stop = true;
    this.checkForImmediateStop();
  }

  public submitCompleted(complete: any): void {
    if (!complete.success) {
      this.failedWebsitePosts.push(complete.website);
      this.hasFailure = true;

      if (!this.stop && !this.stopDialog && !this.stopOnFailure) {
        this.stopDialog = this.dialog.open(ConfirmDialogComponent, {
          disableClose: true,
          height: '700',
          width: '700',
          data: {
            title: 'Stop',
            option: 'Stop On Error'
          }
        });

        this.stopDialog.afterClosed().subscribe((response) => {
          if (response) {
            this.stop = true;
            this.checkForImmediateStop();
          }
        });
      }
    }

    this.submitCount += 1;

    if (this.submitCount === this.submissionData.getUnpostedWebsites().length) {
      if (this.stopDialog) {
        this.stopDialog.close();
      }
      this.complete();
    }
  }

  private checkForImmediateStop(): void {
    let close: boolean = true;
    this.statuses.forEach(status => {
      if (status.getStatus() !== 'Initializing') close = false;
    });

    if (close) {
      this.close();
    }
  }

  private complete(): void {
    const submitData = this.submissionData;
    submitData.setUnpostedWebsites(this.failedWebsitePosts);

    if (this.stop || this.stopOnFailure) {
      this.close();
    } else {
      this.selectedWebsites = [];
      // this.communicator.reply({ submission: submitData, success: this.hasFailure }, 200);

      this.clean();
      this.increment();
      this.next(this.completeCallback({ submission: submitData, success: this.hasFailure }));
      this.check();
    }
  }

  private clean(): void {
    this.hasFailure = false;
    this.failedWebsitePosts = [];
    this.submitCount = 0;
    this.description = '';
    this.tags = [];
    this.title = '';
    this.submissionType = '';
    this.submissionRating = '';
    this.submissionData = null;
    this.selectedWebsites = [];

    this.check();
  }

  private increment(): void {
    this.totalCompleted += 1;
    this.percentDone = (this.totalCompleted / (this.postService.getQueueCount() + this.totalCompleted)) * 100;
  }

  private close(): void {
    this.dialogRef.close(!this.stop);
  }

  private check(): void {
    this._changeDetector.markForCheck();
    this._changeDetector.detectChanges();
  }

  public emergencyStop(): void {
    // whatever the reason just refresh the page
    // not my problem what happens
    location.reload();
  }

}
