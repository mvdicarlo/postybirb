import { NgModule, APP_INITIALIZER, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Weasyl } from './website-services/weasyl/weasyl.service';
import { FurAffinity } from './website-services/fur-affinity/fur-affinity.service';

import { TranslateModule } from '@ngx-translate/core';

import {
  MatIconModule,
  MatDialogModule
} from '@angular/material';

import { GenericLoginDialog } from './components/generic-login-dialog/generic-login-dialog.component';

export function INIT_WEBSITE_REGISTRY(...args) {
  return () => {};
}

@NgModule({
  declarations: [
    GenericLoginDialog
  ],
  imports: [
    CommonModule,
    TranslateModule,
    MatIconModule,
    MatDialogModule
  ],
  exports: [
    GenericLoginDialog
  ],
  entryComponents: [
    GenericLoginDialog
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: INIT_WEBSITE_REGISTRY,
      deps: [
        FurAffinity,
        Weasyl
      ],
      multi: true
    }
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class WebsitesModule { }
