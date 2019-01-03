import { Component } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'patreon-dialog',
  templateUrl: './patreon-dialog.component.html',
  styleUrls: ['./patreon-dialog.component.css']
})
export class PatreonDialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'https://www.patreon.com/login';
  }
}
