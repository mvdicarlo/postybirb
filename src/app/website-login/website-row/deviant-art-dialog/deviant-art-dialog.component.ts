import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { WebsiteCoordinatorService } from '../../../commons/services/website-coordinator/website-coordinator.service';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';

@Component({
  selector: 'deviant-art-dialog',
  templateUrl: './deviant-art-dialog.component.html',
  styleUrls: ['./deviant-art-dialog.component.css']
})
export class DeviantArtDialogComponent implements OnInit, OnDestroy {
  @ViewChild('webview') webview: ElementRef;
  private deviantart: any;

  constructor(private service: WebsiteCoordinatorService) {
    this.deviantart = window['deviantart'];
  }

  ngOnInit() {
    this.service.authorizeWebsite(SupportedWebsites.DeviantArt, undefined).then((url) => {
      this.webview.nativeElement.src = url;
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
