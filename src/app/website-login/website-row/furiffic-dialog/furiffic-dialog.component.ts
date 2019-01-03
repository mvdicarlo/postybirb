import { Component } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'furiffic-dialog',
  templateUrl: './furiffic-dialog.component.html',
  styleUrls: ['./furiffic-dialog.component.css']
})
export class FurifficDialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'https://www.furiffic.com/';
  }
}
