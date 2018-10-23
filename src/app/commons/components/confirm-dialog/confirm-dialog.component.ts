import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

interface DialogFields {
  title: string;
  option?: string; //Extra text to appear in the dialog (translated)
}

@Component({
  selector: 'confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Default Dialog Component for simple confirm/deny actions
 * @tutorial More documentation on Material Dialogs can be found https://material.angular.io/components/dialog/api
 */
export class ConfirmDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogFields, public dialogRef: MatDialogRef<ConfirmDialogComponent>) { }

}
