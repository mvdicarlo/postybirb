import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'newgrounds-dialog',
  templateUrl: './newgrounds-dialog.component.html',
  styleUrls: ['./newgrounds-dialog.component.css']
})
export class NewgroundsDialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }
}
