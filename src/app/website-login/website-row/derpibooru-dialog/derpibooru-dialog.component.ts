import { Component } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'derpibooru-dialog',
  templateUrl: './derpibooru-dialog.component.html',
  styleUrls: ['./derpibooru-dialog.component.css']
})
export class DerpibooruDialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'https://derpibooru.org/users/sign_in';
  }
}
