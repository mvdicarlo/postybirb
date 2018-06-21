import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import {
  MatButtonModule,
  MatDialogModule,
  MatInputModule,
  MatTooltipModule,
  MatCheckboxModule
} from '@angular/material';

import { PBWebsitesComponent } from './pb-websites.component';
import { LoginPanelComponent } from './login-panel/login-panel.component';
import { FuraffinityLoginDialogComponent } from './website-row/furaffinity/furaffinity-login-dialog/furaffinity-login-dialog.component';
import { WeasylDialogComponent } from './website-row/weasyl/weasyl-dialog/weasyl-dialog.component';
import { FurifficDialogComponent } from './website-row/furiffic/furiffic-dialog/furiffic-dialog.component';
import { PixivDialogComponent } from './website-row/pixiv/pixiv-dialog/pixiv-dialog.component';
import { SofurryDialogComponent } from './website-row/sofurry/sofurry-dialog/sofurry-dialog.component';
import { E621DialogComponent } from './website-row/e621/e621-dialog/e621-dialog.component';
import { FurrynetworkDialogComponent } from './website-row/furrynetwork/furrynetwork-dialog/furrynetwork-dialog.component';
import { TumblrDialogComponent } from './website-row/tumblr/tumblr-dialog/tumblr-dialog.component';
import { DeviantArtDialogComponent } from './website-row/deviant-art/deviant-art-dialog/deviant-art-dialog.component';
import { InkbunnyDialogComponent } from './website-row/inkbunny/inkbunny-dialog/inkbunny-dialog.component';
import { Route50DialogComponent } from './website-row/route50/route50-dialog/route50-dialog.component';
import { TwitterDialogComponent } from './website-row/twitter/twitter-dialog/twitter-dialog.component';
import { WebsiteStatusComponent } from './website-status/website-status.component';
import { PatreonDialogComponent } from './website-row/patreon/patreon-dialog/patreon-dialog.component';
import { DerpibooruDialogComponent } from './website-row/derpibooru/derpibooru-dialog/derpibooru-dialog.component';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatTooltipModule,
    MatCheckboxModule
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
    DerpibooruDialogComponent
  ],
  entryComponents: [
    LoginPanelComponent,
    FuraffinityLoginDialogComponent,
    WeasylDialogComponent,
    FurifficDialogComponent,
    PatreonDialogComponent,
    PixivDialogComponent,
    SofurryDialogComponent,
    E621DialogComponent,
    FurrynetworkDialogComponent,
    TumblrDialogComponent,
    DeviantArtDialogComponent,
    InkbunnyDialogComponent,
    Route50DialogComponent,
    TwitterDialogComponent,
    WebsiteStatusComponent,
    DerpibooruDialogComponent
  ],
  exports: [
    PBWebsitesComponent
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class WebsiteLoginModule { }
