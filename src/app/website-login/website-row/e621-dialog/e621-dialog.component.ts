import { Component, AfterContentInit } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'e621-dialog',
  templateUrl: './e621-dialog.component.html',
  styleUrls: ['./e621-dialog.component.css']
})
export class E621DialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'https://e621.net/user/login';
  }
}
