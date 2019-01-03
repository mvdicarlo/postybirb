import { Component } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'paigeeworld-dialog',
  templateUrl: './paigeeworld-dialog.component.html',
  styleUrls: ['./paigeeworld-dialog.component.css']
})
export class PaigeeworldDialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'https://www.paigeeworld.com/login';
  }
}
