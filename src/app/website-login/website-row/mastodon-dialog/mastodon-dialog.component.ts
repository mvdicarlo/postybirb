import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { WebsiteManagerService } from '../../../commons/services/website-manager/website-manager.service';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'mastodon-dialog',
  templateUrl: './mastodon-dialog.component.html',
  styleUrls: ['./mastodon-dialog.component.css']
})
export class MastodonDialogComponent implements OnInit, OnDestroy {
  @ViewChild('webview') webview: ElementRef;
  private mastodon: any;
  public failed: boolean;

  constructor(private service: WebsiteManagerService, private dialogRef: MatDialogRef<MastodonDialogComponent>) {
    this.mastodon = window['mastodon'];
  }

  ngOnInit() {
    this.failed = false;
    this.service.authorizeWebsite(SupportedWebsites.Mastodon, null).then((url) => {
      this.webview.nativeElement.src = url;
    });
  }

  ngOnDestroy() {
  }

  public submitCode(code: string): void {
    this.service.authorizeWebsite(SupportedWebsites.Mastodon, code).then(function() {
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
