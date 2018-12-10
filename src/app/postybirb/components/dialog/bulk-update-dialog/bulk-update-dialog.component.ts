import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatSelectChange } from '@angular/material';
import { SubmissionArchive } from '../../../models/postybirb-submission-model';

@Component({
  selector: 'bulk-update-dialog',
  templateUrl: './bulk-update-dialog.component.html',
  styleUrls: ['./bulk-update-dialog.component.css']
})
export class BulkUpdateDialogComponent {
  public selected: string[] = [];
  public archives: SubmissionArchive[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<BulkUpdateDialogComponent>) {
    this.selected = data.selected;
    this.archives = data.archives;
  }

  public selectionChanged(change: MatSelectChange): void {
    this.selected = change.value;
  }

  public updateSelected(): void {
    this.dialogRef.close(this.selected);
  }

}
