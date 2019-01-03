import { Component } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'pixiv-dialog',
  templateUrl: './pixiv-dialog.component.html',
  styleUrls: ['./pixiv-dialog.component.css']
})
export class PixivDialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'https://www.pixiv.net/';
  }
}
