import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { PostyBirbSubmissionModel } from '../../../models/postybirb-submission-model';

@Component({
  selector: 'schedule-submission-dialog',
  templateUrl: './schedule-submission-dialog.component.html',
  styleUrls: ['./schedule-submission-dialog.component.css']
})
export class ScheduleSubmissionDialogComponent implements OnInit {
  public minDate: Date;
  public form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: PostyBirbSubmissionModel, public dialogRef: MatDialogRef<ScheduleSubmissionDialogComponent>, private fb: FormBuilder) {
    this.form = fb.group({
      scheduledDate: [undefined]
    });
  }

  ngOnInit() {
    this.minDate = new Date();
    if (this.data.schedule) {
      this.form.controls.scheduledDate.patchValue(new Date(this.data.schedule));
    }
  }

  acceptSubmission(): void {
    const values = this.form.value;
    this.data.schedule = values.scheduledDate;
    this.dialogRef.close(this.data);
  }

}
