import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'remake-alert-dialog',
  templateUrl: './remake-alert-dialog.component.html',
  styleUrls: ['./remake-alert-dialog.component.css']
})
export class RemakeAlertDialogComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<RemakeAlertDialogComponent>) { }

  ngOnInit() {
  }

  public openInfo() {
    openUrlInBrowser('http://www.postybirb.com/postybirb-next.html');
  }

  public stopNotify() {
    store.set('disablev2Notification', true);
    this.dialogRef.close();
  }

}
