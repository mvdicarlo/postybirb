import { NgModule, ModuleWithProviders, NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import {
  MatButtonModule,
  MatDialogModule,
  MatIconModule,
  MatInputModule,
  MatTooltipModule,
  MatSnackBarModule
} from '@angular/material';

import { SnotifyModule, SnotifyService, ToastDefaults } from 'ng-snotify';
import { NotifyService } from './services/notify/notify.service';

import { Aryion } from './models/website/aryion';
import { Derpibooru } from './models/website/derpibooru';
import { DeviantArt } from './models/website/deviantart';
import { E621 } from './models/website/e621';
import { Furaffinity } from './models/website/furaffinity';
import { Furiffic } from './models/website/furiffic';
import { FurryAmino } from './models/website/furry-amino';
import { FurryNetwork } from './models/website/furrynetwork';
import { HentaiFoundry } from './models/website/hentaifoundry';
import { Inkbunny } from './models/website/inkbunny';
import { Newgrounds } from './models/website/newgrounds';
import { Mastodon } from './models/website/mastodon';
import { Pixiv } from './models/website/pixiv';
import { PaigeeWorld } from './models/website/paigee-world';
import { Patreon } from './models/website/patreon';
import { Route50 } from './models/website/route50';
import { SoFurry } from './models/website/sofurry';
import { Tumblr } from './models/website/tumblr';
import { Twitter } from './models/website/twitter';
import { Weasyl } from './models/website/weasyl';

import { WebsiteManagerService } from './services/website-manager/website-manager.service';
import { WebsiteCoordinatorService } from './services/website-coordinator/website-coordinator.service';
import { UpdateService } from './services/update/update.service';

import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { FileViewerComponent } from './components/file-viewer/file-viewer.component';
import { BaseControlValueAccessorComponent } from './components/base-control-value-accessor/base-control-value-accessor.component';
import { SafePipe } from './pipes/safe.pipe';
import { WebsiteLogoComponent } from './components/website-logo/website-logo.component';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    TranslateModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    MatSnackBarModule,
    SnotifyModule
  ],
  declarations: [
    FileViewerComponent,
    ConfirmDialogComponent,
    BaseControlValueAccessorComponent,
    SafePipe,
    WebsiteLogoComponent,
  ],
  exports: [
    FileViewerComponent,
    ConfirmDialogComponent,
    BaseControlValueAccessorComponent,
    SafePipe,
    WebsiteLogoComponent,
  ],
  entryComponents: [
    ConfirmDialogComponent
  ],
  providers: [
    Aryion,
    Derpibooru,
    DeviantArt,
    E621,
    Furaffinity,
    Furiffic,
    FurryAmino,
    FurryNetwork,
    HentaiFoundry,
    Inkbunny,
    Newgrounds,
    Mastodon,
    Pixiv,
    Patreon,
    PaigeeWorld,
    Route50,
    SoFurry,
    Tumblr,
    Twitter,
    Weasyl,
    { provide: 'SnotifyToastConfig', useValue: ToastDefaults },
    SnotifyService
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class CommonsModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: CommonsModule,
      providers: [
        UpdateService,
        WebsiteManagerService,
        WebsiteCoordinatorService,
        NotifyService
      ]
    }
  }
}
