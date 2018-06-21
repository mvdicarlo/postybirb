import { Component, OnInit } from '@angular/core';
import { WebsiteManagerService } from '../commons/services/website-manager/website-manager.service';
import { SupportedWebsites } from '../commons/enums/supported-websites';

import { DerpibooruDialogComponent } from './website-row/derpibooru/derpibooru-dialog/derpibooru-dialog.component';
import { DeviantArtDialogComponent } from './website-row/deviant-art/deviant-art-dialog/deviant-art-dialog.component';
import { E621DialogComponent } from './website-row/e621/e621-dialog/e621-dialog.component';
import { FuraffinityLoginDialogComponent } from './website-row/furaffinity/furaffinity-login-dialog/furaffinity-login-dialog.component';
import { FurifficDialogComponent } from './website-row/furiffic/furiffic-dialog/furiffic-dialog.component';
import { FurrynetworkDialogComponent } from './website-row/furrynetwork/furrynetwork-dialog/furrynetwork-dialog.component';
import { InkbunnyDialogComponent } from './website-row/inkbunny/inkbunny-dialog/inkbunny-dialog.component';
import { PatreonDialogComponent } from './website-row/patreon/patreon-dialog/patreon-dialog.component';
import { PixivDialogComponent } from './website-row/pixiv/pixiv-dialog/pixiv-dialog.component';
import { Route50DialogComponent } from './website-row/route50/route50-dialog/route50-dialog.component';
import { SofurryDialogComponent } from './website-row/sofurry/sofurry-dialog/sofurry-dialog.component';
import { TumblrDialogComponent } from './website-row/tumblr/tumblr-dialog/tumblr-dialog.component';
import { TwitterDialogComponent } from './website-row/twitter/twitter-dialog/twitter-dialog.component';
import { WeasylDialogComponent } from './website-row/weasyl/weasyl-dialog/weasyl-dialog.component';

interface LoginObject {
  website: string;
  dialogComponent: any;
}

@Component({
  selector: 'pb-websites',
  templateUrl: './pb-websites.component.html',
  styleUrls: ['./pb-websites.component.css']
})

export class PBWebsitesComponent implements OnInit {
  private refreshIntervalLimiter: number;
  public lastRefresh: number;
  public websites: LoginObject[];

  constructor(private webManager: WebsiteManagerService) { }

  ngOnInit() {
    this.websites = [
      {
        website: SupportedWebsites.Derpibooru,
        dialogComponent: DerpibooruDialogComponent
      }, {
        website: SupportedWebsites.DeviantArt,
        dialogComponent: DeviantArtDialogComponent
      }, {
        website: SupportedWebsites.e621,
        dialogComponent: E621DialogComponent
      }, {
        website: SupportedWebsites.Furaffinity,
        dialogComponent: FuraffinityLoginDialogComponent
      }, {
        website: SupportedWebsites.Furiffic,
        dialogComponent: FurifficDialogComponent
      }, {
        website: SupportedWebsites.FurryNetwork,
        dialogComponent: FurrynetworkDialogComponent
      }, {
        website: SupportedWebsites.Inkbunny,
        dialogComponent: InkbunnyDialogComponent
      }, {
        website: SupportedWebsites.Patreon,
        dialogComponent: PatreonDialogComponent
      }, {
        website: SupportedWebsites.Pixiv,
        dialogComponent: PixivDialogComponent
      }, {
        website: SupportedWebsites.Route50,
        dialogComponent: Route50DialogComponent
      }, {
        website: SupportedWebsites.SoFurry,
        dialogComponent: SofurryDialogComponent
      }, {
        website: SupportedWebsites.Tumblr,
        dialogComponent: TumblrDialogComponent
      }, {
        website: SupportedWebsites.Twitter,
        dialogComponent: TwitterDialogComponent
      }, {
        website: SupportedWebsites.Weasyl,
        dialogComponent: WeasylDialogComponent
      }
    ];

    this.lastRefresh = Date.now();
    this.refreshIntervalLimiter = 30000;
  }

  refreshStatuses() {
    const now = Date.now();
    if (now - this.lastRefresh >= this.refreshIntervalLimiter) {
      this.webManager.refreshAllStatuses();
      this.lastRefresh = now;
    }
  }

}
