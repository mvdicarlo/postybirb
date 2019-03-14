/**
 * Simple dialog used to confirm an action
 */

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

export interface ConfirmOptions {
  title: string;
}

@Component({
  selector: 'confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css']
})
export class ConfirmDialog {
  public title: string;

  constructor(@Inject(MAT_DIALOG_DATA) public data: ConfirmOptions) {
    this.title = data.title;
  }

}
