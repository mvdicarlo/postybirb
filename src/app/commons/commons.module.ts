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

import { Derpibooru } from './models/website/derpibooru';
import { DeviantArt } from './models/website/deviantart';
import { E621 } from './models/website/e621';
import { Furaffinity } from './models/website/furaffinity';
import { Furiffic } from './models/website/furiffic';
import { FurryNetwork } from './models/website/furrynetwork';
import { HentaiFoundry } from './models/website/hentaifoundry';
import { Inkbunny } from './models/website/inkbunny';
import { Pixiv } from './models/website/pixiv';
import { Patreon } from './models/website/patreon';
import { Route50 } from './models/website/route50';
import { SoFurry } from './models/website/sofurry';
import { Tumblr } from './models/website/tumblr';
import { Twitter } from './models/website/twitter';
import { Weasyl } from './models/website/weasyl';

import { WebsiteManagerService } from './services/website-manager/website-manager.service';
import { UpdateService } from './services/update/update.service';
import { HighlightLinkedService } from './directives/highlight-linked/highlight-linked.service';

import { FileInputComponent } from './components/file-input/file-input.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { FileViewerComponent } from './components/file-viewer/file-viewer.component';
import { BaseControlValueAccessorComponent } from './components/base-control-value-accessor/base-control-value-accessor.component';
import { SafePipe } from './pipes/safe.pipe';
import { WebsiteLogoComponent } from './components/website-logo/website-logo.component';
import { HighlightLinkedDirective } from './directives/highlight-linked/highlight-linked.directive';

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
    FileInputComponent,
    BaseControlValueAccessorComponent,
    SafePipe,
    WebsiteLogoComponent,
    HighlightLinkedDirective
  ],
  exports: [
    FileViewerComponent,
    ConfirmDialogComponent,
    FileInputComponent,
    BaseControlValueAccessorComponent,
    SafePipe,
    WebsiteLogoComponent,
    HighlightLinkedDirective
  ],
  entryComponents: [
    ConfirmDialogComponent
  ],
  providers: [
    Derpibooru,
    DeviantArt,
    E621,
    Furaffinity,
    Furiffic,
    FurryNetwork,
    HentaiFoundry,
    Inkbunny,
    Pixiv,
    Patreon,
    Route50,
    SoFurry,
    Tumblr,
    Twitter,
    Weasyl,
    HighlightLinkedService,
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
        NotifyService
      ]
    }
  }
}
