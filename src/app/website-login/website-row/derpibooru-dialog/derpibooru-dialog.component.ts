import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'derpibooru-dialog',
  templateUrl: './derpibooru-dialog.component.html',
  styleUrls: ['./derpibooru-dialog.component.css']
})
export class DerpibooruDialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }
}
