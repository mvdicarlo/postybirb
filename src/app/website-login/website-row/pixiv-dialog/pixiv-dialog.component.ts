import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'pixiv-dialog',
  templateUrl: './pixiv-dialog.component.html',
  styleUrls: ['./pixiv-dialog.component.css']
})
export class PixivDialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }
}
