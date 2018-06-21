import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { PostyBirbSubmission } from '../../../../commons/models/posty-birb/posty-birb-submission';

@Component({
  selector: 'save-edit-dialog',
  templateUrl: './save-edit-dialog.component.html',
  styleUrls: ['./save-edit-dialog.component.css']
})
export class SaveEditDialogComponent implements OnInit {

  public control: FormControl;

  constructor(@Inject(MAT_DIALOG_DATA) public data: PostyBirbSubmission[], public dialogRef: MatDialogRef<SaveEditDialogComponent>) { }

  ngOnInit() {
    this.control = new FormControl(this.data, Validators.required);
  }

  public save(): void {
    if (this.data.length > 1) {
      this.dialogRef.close(this.control.value);
    } else {
      this.dialogRef.close(this.data);
    }
  }

}
