import { Component, AfterViewInit, Inject, ViewChild, ElementRef, Injector } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { WebsiteService } from '../../interfaces/website-service.interface';

export interface GenericLoginDialogOptions {
  url: string;
  persist: string;
  title: string;
  website: WebsiteService;
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
  private service: WebsiteService;

  constructor(@Inject(MAT_DIALOG_DATA) public data: GenericLoginDialogOptions, injector: Injector) {
    this.service = injector.get(data.website);
  }

  ngAfterViewInit() {
    this.webview.nativeElement.partition = `persist:${this.data.persist}`;
    this.webview.nativeElement.src = this.data.url;
  }

  public resetCookies(): void {
    this.service.resetCookies(this.data.persist)
      .finally(() => {
        if (this.webview) {
          this.webview.nativeElement.loadURL(this.data.url);
        }
      });
  }

}
