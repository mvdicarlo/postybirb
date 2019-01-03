import { Component } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'furaffinity-login-dialog',
  templateUrl: './furaffinity-login-dialog.component.html',
  styleUrls: ['./furaffinity-login-dialog.component.css']
})
export class FuraffinityLoginDialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'https://www.furaffinity.net/login';
  }
}
