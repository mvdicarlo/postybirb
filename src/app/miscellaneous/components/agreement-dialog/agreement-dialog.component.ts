import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'agreement-dialog',
  templateUrl: './agreement-dialog.component.html',
  styleUrls: ['./agreement-dialog.component.css']
})
export class AgreementDialogComponent {
  constructor(public dialogRef: MatDialogRef<AgreementDialogComponent>) { }
}
