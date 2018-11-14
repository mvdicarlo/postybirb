import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'weasyl-dialog',
  templateUrl: './weasyl-dialog.component.html',
  styleUrls: ['./weasyl-dialog.component.css']
})
export class WeasylDialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }
}
