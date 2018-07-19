import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { Store } from '@ngxs/store';

import { MatDialog, MatDialogRef } from '@angular/material';
import { EditFormDialogComponent } from './edit-form-dialog/edit-form-dialog.component';
import { SaveDialogComponent } from './save-dialog/save-dialog.component';

import { PostyBirbSubmission, SubmissionArchive } from '../../../commons/models/posty-birb/posty-birb-submission';
import { SubmissionCardContainerComponent } from './submission-card-container/submission-card-container.component';
import { SupportedWebsiteRestrictions } from '../../models/supported-websites-restrictions';
import { PostyBirbStateAction } from '../../stores/states/posty-birb.state';

interface SubmitObject {
  data: PostyBirbSubmission;
  status: any;
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

  constructor(private dialog: MatDialog, private _store: Store) { }

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

    const validSubmissions: PostyBirbSubmission[] = this.submissions.map(submission => {
      this.trimSelectedWebsites(submission);
      return submission;
    });

    let dialogRef: MatDialogRef<SaveDialogComponent> = this.dialog.open(SaveDialogComponent, {
      data: this.submissions,
      width: '60%'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.submit(validSubmissions, result === 'POST');
        this.editForm.clear();
        this.submissions = [];
        this.submissionContainer.clearSelected();
      }
    });
  }

  private submit(submissions: PostyBirbSubmission[], postImmediately: boolean): void {
    for (let i = 0; i < submissions.length; i++) {
      const submission = submissions[i];
      if (submission.getUnpostedWebsites().length > 0) {
        const archive: SubmissionArchive = submission.asSubmissionArchive();
        const actions: any[] = [new PostyBirbStateAction.AddSubmission(archive, true)];
        if (postImmediately) {
          actions.push(new PostyBirbStateAction.QueueSubmission(archive));
        }

        this._store.dispatch(actions);
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
    this.saveSubmissions();
  }

}
