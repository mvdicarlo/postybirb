import { Component, AfterContentInit } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'furry-amino-dialog',
  templateUrl: './furry-amino-dialog.component.html',
  styleUrls: ['./furry-amino-dialog.component.css']
})
export class FurryAminoDialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'https://aminoapps.com/c/furry-amino/home/';
  }
}
