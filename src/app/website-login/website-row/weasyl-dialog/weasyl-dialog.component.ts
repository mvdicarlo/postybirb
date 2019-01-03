import { Component } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'weasyl-dialog',
  templateUrl: './weasyl-dialog.component.html',
  styleUrls: ['./weasyl-dialog.component.css']
})
export class WeasylDialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'https://www.weasyl.com/signin';
  }
}
