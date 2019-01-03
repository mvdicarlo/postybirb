import { Component, ViewChild, AfterContentInit, ElementRef } from '@angular/core';

@Component({
  selector: 'base-website-dialog',
  template: '<div></div>',
})
export class BaseWebsiteDialog implements AfterContentInit {
  @ViewChild('webview') webview: ElementRef;
  public url: string;

  constructor() {}

  ngAfterContentInit() {
    if (getPartition()) {
      this.webview.nativeElement.partition = getPartition();
    }
    this.webview.nativeElement.src = this.url;
  }

}
