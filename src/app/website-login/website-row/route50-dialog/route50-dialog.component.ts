import { Component } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'route50-dialog',
  templateUrl: './route50-dialog.component.html',
  styleUrls: ['./route50-dialog.component.css']
})
export class Route50DialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'http://www.route50.net/';
  }
}
