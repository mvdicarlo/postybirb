import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { WebsiteCoordinatorService } from '../../../commons/services/website-coordinator/website-coordinator.service';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';

@Component({
  selector: 'tumblr-dialog',
  templateUrl: './tumblr-dialog.component.html',
  styleUrls: ['./tumblr-dialog.component.css']
})
export class TumblrDialogComponent implements OnInit, OnDestroy {
  @ViewChild('webview') webview: ElementRef;
  private tumblr: any;

  constructor(private service: WebsiteCoordinatorService) {
    this.tumblr = window['tumblr'];
  }

  ngOnInit() {
    this.service.authorizeWebsite(SupportedWebsites.Tumblr, undefined).then((url) => {
      if (getPartition()) {
        this.webview.nativeElement.partition = getPartition();
      }
      this.webview.nativeElement.src = url;
    });
  }

  ngOnDestroy() {
    this.tumblr.stop();
  }

  public unauthorize() {
    this.service.unauthorizeWebsite(SupportedWebsites.Tumblr);
  }

}
