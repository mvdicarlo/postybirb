import { Component, AfterViewInit, Inject, ViewChild, ElementRef } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

export interface GenericLoginDialogOptions {
  url: string;
  persist: string;
  title: string;
}

@Component({
  selector: 'generic-login-dialog',
  templateUrl: './generic-login-dialog.component.html',
  styleUrls: ['./generic-login-dialog.component.css'],
  host: {
    'class': 'login-dialog'
  }
})
export class GenericLoginDialog implements AfterViewInit {
  @ViewChild('webview') webview: ElementRef;

  constructor(@Inject(MAT_DIALOG_DATA) public data: GenericLoginDialogOptions) { }

  ngAfterViewInit() {
    this.webview.nativeElement.partition = `persist:${this.data.persist}`;
    this.webview.nativeElement.src = this.data.url;
  }

}
