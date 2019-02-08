import { NgModule, APP_INITIALIZER, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

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
import { E621SubmissionForm } from './website-services/e621/components/e621-submission-form/e621-submission-form.component';
import { WebsiteDisplaynamePipe } from './pipes/website-displayname.pipe';

export function INIT_WEBSITE_REGISTRY() {
  return () => {};
}

@NgModule({
  declarations: [
    GenericLoginDialog,
    BaseWebsiteSubmissionForm,
    WeasylSubmissionForm,
    WebsiteSubmissionFormDisplayDirective,
    E621SubmissionForm,
    WebsiteDisplaynamePipe,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    UtilsModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    FormsModule,
    ReactiveFormsModule
  ],
  exports: [
    GenericLoginDialog,
    WebsiteSubmissionFormDisplayDirective,
    WebsiteDisplaynamePipe
  ],
  entryComponents: [
    GenericLoginDialog,
    WeasylSubmissionForm,
    E621SubmissionForm
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
