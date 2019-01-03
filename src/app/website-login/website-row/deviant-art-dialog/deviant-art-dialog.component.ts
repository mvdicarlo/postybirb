import { Component, OnDestroy, ViewChild, ElementRef, AfterContentInit } from '@angular/core';
import { WebsiteCoordinatorService } from '../../../commons/services/website-coordinator/website-coordinator.service';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { BaseWebsiteDialog } from '../base-website-dialog/base-website-dialog.component';

@Component({
  selector: 'deviant-art-dialog',
  templateUrl: './deviant-art-dialog.component.html',
  styleUrls: ['./deviant-art-dialog.component.css']
})
export class DeviantArtDialogComponent extends BaseWebsiteDialog implements AfterContentInit, OnDestroy {
  @ViewChild('webview') webview: ElementRef;
  private deviantart: any;

  constructor(private service: WebsiteCoordinatorService) {
    super();

    this.deviantart = window['deviantart'];
  }

  ngAfterContentInit() {
    this.service.authorizeWebsite(SupportedWebsites.DeviantArt, undefined).then((url) => {
      this.url = url;
      super.ngAfterContentInit();
    });
  }

  ngOnDestroy() {
    this.deviantart.stop();
  }

  unauthorize() {
    this.service.unauthorizeWebsite(SupportedWebsites.DeviantArt);
    setTimeout(function() {
      this.service.authorizeWebsite(SupportedWebsites.DeviantArt, undefined).then((url) => {
        this.webview.nativeElement.src = url;
      });
    }.bind(this), 1000)
  }

}
