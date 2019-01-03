import { Component } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'sofurry-dialog',
  templateUrl: './sofurry-dialog.component.html',
  styleUrls: ['./sofurry-dialog.component.css']
})
export class SofurryDialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'https://www.sofurry.com/';
  }
}
