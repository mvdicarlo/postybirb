import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'remake-alert-dialog',
  templateUrl: './remake-alert-dialog.component.html',
  styleUrls: ['./remake-alert-dialog.component.css']
})
export class RemakeAlertDialogComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

  public openInfo() {
    openUrlInBrowser('http://www.postybirb.com/postybirb-next.html');
  }

}
