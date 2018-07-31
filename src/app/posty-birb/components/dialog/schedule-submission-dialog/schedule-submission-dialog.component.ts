import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { PostyBirbSubmission } from '../../../../commons/models/posty-birb/posty-birb-submission';

@Component({
  selector: 'app-schedule-submission-dialog',
  templateUrl: './schedule-submission-dialog.component.html',
  styleUrls: ['./schedule-submission-dialog.component.css']
})
export class ScheduleSubmissionDialogComponent implements OnInit {
  public minDate: Date;
  public form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: PostyBirbSubmission, public dialogRef: MatDialogRef<ScheduleSubmissionDialogComponent>, private fb: FormBuilder) {
    this.form = fb.group({
      scheduledDate: [undefined]
    });
  }

  ngOnInit() {
    this.minDate = new Date();
    if (this.data.isScheduled()) {
      this.form.controls.scheduledDate.patchValue(new Date(this.data.getSchedule()));
    }
  }

  acceptSubmission(): void {
    const values = this.form.value;
    this.data.setSchedule(values.scheduledDate);
    this.dialogRef.close(this.data);
  }

}
