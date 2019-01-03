import { Component } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'aryion-dialog',
  templateUrl: './aryion-dialog.component.html',
  styleUrls: ['./aryion-dialog.component.css']
})
export class AryionDialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'https://aryion.com/forum/ucp.php?mode=login';
  }
}
