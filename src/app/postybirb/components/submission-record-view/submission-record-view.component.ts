import { Component, OnInit, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Submission } from 'src/app/database/models/submission.model';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { MatDialog } from '@angular/material';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'submission-record-view',
  templateUrl: './submission-record-view.component.html',
  styleUrls: ['./submission-record-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubmissionRecordViewComponent implements OnInit {
  @Input() submission: Submission;
  public form: FormGroup;
  public editing: boolean = false;

  constructor(private _changeDetector: ChangeDetectorRef,
    private _submissionCache: SubmissionCache,
    private _submissionDB: SubmissionDBService,
    private dialog: MatDialog,
    fb: FormBuilder) {
    this.form = fb.group({
      title: [null],
      rating: [null, Validators.required],
      schedule: [null]
    }, { updateOn: 'blur' });
  }

  ngOnInit() {
    this.form.patchValue({
      title: this.submission.title,
      rating: this.submission.rating,
      schedule: this.submission.schedule ? new Date(this.submission.schedule) : null
    }, { emitEvent: false });

    this.form.controls.title.valueChanges.subscribe(title => {
      this.submission.title = (title || '').trim();
    });

    this.form.controls.rating.valueChanges.subscribe(rating => {
      this.submission.rating = rating;
    });

    this.form.controls.schedule.valueChanges.subscribe((schedule: Date) => {
      this.submission.schedule = schedule ? schedule.getTime() : null;
    });

    this.submission.changes.subscribe(change => {
      if (change.title) this.form.patchValue({ title: change.title.current }, { emitEvent: false });
      if (change.rating) this.form.patchValue({ rating: change.rating.current }, { emitEvent: false });
      if (change.schedule) this.form.patchValue({ schedule: change.schedule.current ? new Date(change.schedule.current) : null }, { emitEvent: false });
      if (change.fileInfo) this._changeDetector.markForCheck();
    });

    this._submissionCache.store(this.submission);
  }

  public toggleEditing(): void {
    this.editing = !this.editing;
    this._changeDetector.markForCheck();
  }

  public deleteSubmission(): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete'
      }
    }).afterClosed()
      .subscribe(result => {
        if (result) {
          this._submissionCache.remove(this.submission);
          this._submissionDB.delete([this.submission.id]);
        }
      });
  }

}
