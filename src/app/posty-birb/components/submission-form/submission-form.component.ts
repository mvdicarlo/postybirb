import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { MatDialog, MatDialogRef } from '@angular/material';
import { EditFormDialogComponent } from './edit-form-dialog/edit-form-dialog.component';
import { SaveDialogComponent } from './save-dialog/save-dialog.component';

import { GalleryService } from '../../services/gallery-service/gallery.service';
import { GalleryStatus } from '../../models/gallery-status.model';
import { PostyBirbSubmission } from '../../../commons/models/posty-birb/posty-birb-submission';
import { SubmissionCardContainerComponent } from './submission-card-container/submission-card-container.component';
import { SupportedWebsiteRestrictions } from '../../models/supported-websites-restrictions';

interface SubmitObject {
  data: PostyBirbSubmission;
  status: GalleryStatus;
}

@Component({
  selector: 'submission-form',
  templateUrl: './submission-form.component.html',
  styleUrls: ['./submission-form.component.css']
})
export class SubmissionFormComponent implements OnInit, OnDestroy {
  @ViewChild('container') submissionContainer: SubmissionCardContainerComponent;
  @ViewChild('editForm') editForm: EditFormDialogComponent;

  private subscription: Subscription = Subscription.EMPTY;
  public submissions: PostyBirbSubmission[] = [];

  constructor(private dialog: MatDialog, private galleryService: GalleryService) { }

  ngOnInit() { }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
  }

  public selectedSubmissionsUpdated(submissions: PostyBirbSubmission[]): void {
    this.submissions = submissions || [];
  }

  public submissionsAreSelected(): boolean {
    return this.submissions.length !== 0;
  }

  public saveSubmissions(): void {

    const validSubmissions: SubmitObject[] = this.submissions.map(submission => {
      this.trimSelectedWebsites(submission);

      let currentStatus: GalleryStatus = submission.getGalleryStatus();
      if (currentStatus === GalleryStatus.EDITING) {
        currentStatus = GalleryStatus.UPDATE;
      } else if (currentStatus === GalleryStatus.COPY) {
        currentStatus = GalleryStatus.NEW;
      }

      return { data: submission, status: currentStatus };
    });

    let dialogRef: MatDialogRef<SaveDialogComponent> = this.dialog.open(SaveDialogComponent, {
      data: this.submissions,
      width: '60%'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.submit(validSubmissions)
      }
    });
  }

  private submit(submissions: SubmitObject[]): void {
    for (let i = 0; i < submissions.length; i++) {
      const submission = submissions[i];
      if (submission.data.getUnpostedWebsites().length > 0) {
        this.galleryService.submit(submission.data, submission.status);
      }
    }
  }

  private trimSelectedWebsites(submission: PostyBirbSubmission) {
    const fileInfo: any = submission.getSubmissionFileObject();
    const supportedWebsites = SupportedWebsiteRestrictions.getSupportedWebsites(submission.getSubmissionRating(), submission.getSubmissionType(), fileInfo);
    const selectedWebsites = submission.getDefaultFieldFor('selectedWebsites') || [];

    const selectedWebsitesToKeep = selectedWebsites.filter(website => {
      return supportedWebsites.supported.indexOf(website) !== -1
    });

    submission.setUnpostedWebsites(selectedWebsitesToKeep);
  }

  public onSaveSubmissionFromEdit(): void {
    this.submissionContainer.saveInProgress();
    this.saveSubmissions();
  }

}
