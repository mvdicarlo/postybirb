import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { WebsiteCoordinatorService } from '../../../commons/services/website-coordinator/website-coordinator.service';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'twitter-dialog',
  templateUrl: './twitter-dialog.component.html',
  styleUrls: ['./twitter-dialog.component.css']
})
export class TwitterDialogComponent implements OnInit, OnDestroy {
  @ViewChild('webview') webview: ElementRef;
  private twitter: any;
  public failed: boolean;

  constructor(private service: WebsiteCoordinatorService, private dialogRef: MatDialogRef<TwitterDialogComponent>) {
    this.twitter = window['twitter'];
    this.twitter.start();
  }

  ngOnInit() {
    this.failed = false;
    this.service.authorizeWebsite(SupportedWebsites.Twitter, { step: 1 }).then((url) => {
      if (getPartition()) {
        if (!this.webview.nativeElement.partition) {
          this.webview.nativeElement.partition = getPartition();
        }
      }
      this.webview.nativeElement.src = url;
    });
  }

  ngOnDestroy() {
    this.twitter.stop();
  }

  public submitPIN(pin: string): void {
    this.service.authorizeWebsite(SupportedWebsites.Twitter, { step: 2, pin }).then(function(success) {
      this.failed = false;
      this.dialogRef.close();
    }.bind(this), function(err) {
      this.failed = true;
    }.bind(this));
  }

  public unauthorize() {
    this.service.unauthorizeWebsite(SupportedWebsites.Twitter);
    this.ngOnInit();
  }

}
