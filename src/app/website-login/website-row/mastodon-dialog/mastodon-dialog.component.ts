import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { WebsiteManagerService } from '../../../commons/services/website-manager/website-manager.service';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { MatDialogRef, MatRadioChange } from '@angular/material';

@Component({
  selector: 'mastodon-dialog',
  templateUrl: './mastodon-dialog.component.html',
  styleUrls: ['./mastodon-dialog.component.css']
})
export class MastodonDialogComponent implements OnInit {
  @ViewChild('webview') webview: ElementRef;
  private mastodon: any;
  private type: string = 'social';
  public failed: boolean;

  constructor(private service: WebsiteManagerService, private dialogRef: MatDialogRef<MastodonDialogComponent>) {
    this.mastodon = window['mastodon'];
  }

  ngOnInit() {
    this.failed = false;
    this.service.authorizeWebsite(SupportedWebsites.Mastodon, { site: 'social' }).then((url) => {
      this.webview.nativeElement.src = url;
    });
  }

  public changeType(event: MatRadioChange): void {
    this.type = event.value;
    this.webview.nativeElement.src = '';
    this.service.authorizeWebsite(SupportedWebsites.Mastodon, { site: event.value }).then((url) => {
      this.webview.nativeElement.src = url;
    });
  }

  public submitCode(code: string): void {
    this.service.authorizeWebsite(SupportedWebsites.Mastodon, { code, site: this.type }).then(function() {
      this.failed = false;
      this.dialogRef.close();
    }.bind(this), function() {
      this.failed = true;
    }.bind(this));
  }

  public unauthorize() {
    this.service.unauthorizeWebsite(SupportedWebsites.Mastodon);
    this.ngOnInit();
  }
}
