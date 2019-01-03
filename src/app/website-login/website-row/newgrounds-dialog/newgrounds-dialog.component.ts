import { Component } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'newgrounds-dialog',
  templateUrl: './newgrounds-dialog.component.html',
  styleUrls: ['./newgrounds-dialog.component.css']
})
export class NewgroundsDialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'https://www.newgrounds.com/login';
  }
}
