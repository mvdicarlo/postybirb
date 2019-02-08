import { NgModule, APP_INITIALIZER, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Weasyl } from './website-services/weasyl/weasyl.service';
import { FurAffinity } from './website-services/fur-affinity/fur-affinity.service';
import { E621 } from './website-services/e621/e621.service';

import { TranslateModule } from '@ngx-translate/core';
import { UtilsModule } from '../utils/utils.module';

import {
  MatIconModule,
  MatDialogModule,
  MatButtonModule,
  MatCheckboxModule,
  MatChipsModule,
  MatInputModule,
  MatMenuModule,
  MatProgressBarModule,
  MatRadioModule,
  MatSelectModule,
  MatTabsModule,
  MatTooltipModule,
} from '@angular/material';

import { GenericLoginDialog } from './components/generic-login-dialog/generic-login-dialog.component';
import { BaseWebsiteSubmissionForm } from './components/base-website-submission-form/base-website-submission-form.component';
import { WeasylSubmissionForm } from './website-services/weasyl/components/weasyl-submission-form/weasyl-submission-form.component';
import { WebsiteSubmissionFormDisplayDirective } from './directives/website-submission-form-display.directive';

export function INIT_WEBSITE_REGISTRY(...args) {
  return () => {};
}

@NgModule({
  declarations: [
    GenericLoginDialog,
    BaseWebsiteSubmissionForm,
    WeasylSubmissionForm,
    WebsiteSubmissionFormDisplayDirective
  ],
  imports: [
    CommonModule,
    TranslateModule,
    UtilsModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  exports: [
    GenericLoginDialog,
    WebsiteSubmissionFormDisplayDirective
  ],
  entryComponents: [
    GenericLoginDialog,
    WeasylSubmissionForm
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: INIT_WEBSITE_REGISTRY,
      deps: [
        E621,
        FurAffinity,
        Weasyl
      ],
      multi: true
    }
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class WebsitesModule { }
