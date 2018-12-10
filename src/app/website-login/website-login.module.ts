import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import {
  MatButtonModule,
  MatDialogModule,
  MatInputModule,
  MatTooltipModule,
  MatCheckboxModule,
  MatRadioModule
} from '@angular/material';

import { PBWebsitesComponent } from './pb-websites.component';
import { LoginPanelComponent } from './login-panel/login-panel.component';
import { FuraffinityLoginDialogComponent } from './website-row/furaffinity-login-dialog/furaffinity-login-dialog.component';
import { WeasylDialogComponent } from './website-row/weasyl-dialog/weasyl-dialog.component';
import { FurifficDialogComponent } from './website-row/furiffic-dialog/furiffic-dialog.component';
import { PixivDialogComponent } from './website-row/pixiv-dialog/pixiv-dialog.component';
import { SofurryDialogComponent } from './website-row/sofurry-dialog/sofurry-dialog.component';
import { E621DialogComponent } from './website-row/e621-dialog/e621-dialog.component';
import { FurrynetworkDialogComponent } from './website-row/furrynetwork-dialog/furrynetwork-dialog.component';
import { TumblrDialogComponent } from './website-row/tumblr-dialog/tumblr-dialog.component';
import { DeviantArtDialogComponent } from './website-row/deviant-art-dialog/deviant-art-dialog.component';
import { InkbunnyDialogComponent } from './website-row/inkbunny-dialog/inkbunny-dialog.component';
import { Route50DialogComponent } from './website-row/route50-dialog/route50-dialog.component';
import { TwitterDialogComponent } from './website-row/twitter-dialog/twitter-dialog.component';
import { WebsiteStatusComponent } from './website-status/website-status.component';
import { PatreonDialogComponent } from './website-row/patreon-dialog/patreon-dialog.component';
import { DerpibooruDialogComponent } from './website-row/derpibooru-dialog/derpibooru-dialog.component';
import { HentaiFoundryDialogComponent } from './website-row/hentai-foundry-dialog/hentai-foundry-dialog.component';
import { MastodonDialogComponent } from './website-row/mastodon-dialog/mastodon-dialog.component';
import { PaigeeworldDialogComponent } from './website-row/paigeeworld-dialog/paigeeworld-dialog.component';
import { AryionDialogComponent } from './website-row/aryion-dialog/aryion-dialog.component';
import { FurryAminoDialogComponent } from './website-row/furry-amino-dialog/furry-amino-dialog.component';
import { NewgroundsDialogComponent } from './website-row/newgrounds-dialog/newgrounds-dialog.component';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatRadioModule
  ],
  declarations: [
    LoginPanelComponent,
    FuraffinityLoginDialogComponent,
    WeasylDialogComponent,
    FurifficDialogComponent,
    PixivDialogComponent,
    SofurryDialogComponent,
    E621DialogComponent,
    FurrynetworkDialogComponent,
    TumblrDialogComponent,
    DeviantArtDialogComponent,
    InkbunnyDialogComponent,
    Route50DialogComponent,
    TwitterDialogComponent,
    PBWebsitesComponent,
    WebsiteStatusComponent,
    PatreonDialogComponent,
    DerpibooruDialogComponent,
    HentaiFoundryDialogComponent,
    MastodonDialogComponent,
    PaigeeworldDialogComponent,
    AryionDialogComponent,
    FurryAminoDialogComponent,
    NewgroundsDialogComponent
  ],
  entryComponents: [
    LoginPanelComponent,
    AryionDialogComponent,
    DerpibooruDialogComponent,
    DeviantArtDialogComponent,
    E621DialogComponent,
    FuraffinityLoginDialogComponent,
    FurifficDialogComponent,
    FurryAminoDialogComponent,
    FurrynetworkDialogComponent,
    HentaiFoundryDialogComponent,
    InkbunnyDialogComponent,
    MastodonDialogComponent,
    NewgroundsDialogComponent,
    PaigeeworldDialogComponent,
    PatreonDialogComponent,
    PixivDialogComponent,
    Route50DialogComponent,
    SofurryDialogComponent,
    TumblrDialogComponent,
    TwitterDialogComponent,
    WeasylDialogComponent,
    WebsiteStatusComponent,
  ],
  exports: [
    PBWebsitesComponent
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class WebsiteLoginModule { }
