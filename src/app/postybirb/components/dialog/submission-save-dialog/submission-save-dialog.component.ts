import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { PostyBirbSubmissionModel } from '../../../models/postybirb-submission-model';

@Component({
  selector: 'submission-save-dialog',
  templateUrl: './submission-save-dialog.component.html',
  styleUrls: ['./submission-save-dialog.component.css']
})
export class SubmissionSaveDialogComponent {
  public title: string = 'Save';

  constructor(@Inject(MAT_DIALOG_DATA) public data: PostyBirbSubmissionModel[], public dialogRef: MatDialogRef<SubmissionSaveDialogComponent>) { }

}
