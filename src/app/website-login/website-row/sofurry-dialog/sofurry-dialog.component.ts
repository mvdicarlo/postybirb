import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'sofurry-dialog',
  templateUrl: './sofurry-dialog.component.html',
  styleUrls: ['./sofurry-dialog.component.css']
})
export class SofurryDialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }
}
