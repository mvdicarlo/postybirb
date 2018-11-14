import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'e621-dialog',
  templateUrl: './e621-dialog.component.html',
  styleUrls: ['./e621-dialog.component.css']
})
export class E621DialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }
}
