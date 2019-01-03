import { Component } from '@angular/core';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'hentai-foundry-dialog',
  templateUrl: './hentai-foundry-dialog.component.html',
  styleUrls: ['./hentai-foundry-dialog.component.css']
})
export class HentaiFoundryDialogComponent extends BaseWebsiteDialog {
  constructor() {
    super();
    this.url = 'https://www.hentai-foundry.com/site/login';
  }
}
