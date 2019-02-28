import { NgModule, APP_INITIALIZER, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { E621 } from './website-services/e621/e621.service';
import { FurAffinity } from './website-services/fur-affinity/fur-affinity.service';
import { Route50 } from './website-services/route50/route50.service';
import { Weasyl } from './website-services/weasyl/weasyl.service';
import { Newgrounds } from './website-services/newgrounds/newgrounds.service';
import { Derpibooru } from './website-services/derpibooru/derpibooru.service';
import { Furiffic } from './website-services/furiffic/furiffic.service';
import { FurryAmino } from './website-services/furry-amino/furry-amino.service';
import { Aryion } from './website-services/aryion/aryion.service';
import { PaigeeWorld } from './website-services/paigee-world/paigee-world.service';
import { SoFurry } from './website-services/sofurry/sofurry.service';

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
import { FurAffinitySubmissionForm } from './website-services/fur-affinity/components/fur-affinity-submission-form/fur-affinity-submission-form.component';
import { GenericJournalSubmissionForm } from './components/generic-journal-submission-form/generic-journal-submission-form.component';
import { GenericSubmissionForm } from './components/generic-submission-form/generic-submission-form.component';
import { NewgroundsSubmissionForm } from './website-services/newgrounds/components/newgrounds-submission-form/newgrounds-submission-form.component';
import { DerpibooruSubmissionForm } from './website-services/derpibooru/components/derpibooru-submission-form/derpibooru-submission-form.component';
import { FurryAminoSubmissionForm } from './website-services/furry-amino/components/furry-amino-submission-form/furry-amino-submission-form.component';
import { AryionSubmissionForm } from './website-services/aryion/components/aryion-submission-form/aryion-submission-form.component';
import { PaigeeWorldSubmissionForm } from './website-services/paigee-world/components/paigee-world-submission-form/paigee-world-submission-form.component';
import { SofurrySubmissionForm } from './website-services/sofurry/components/sofurry-submission-form/sofurry-submission-form.component';

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
    FurAffinitySubmissionForm,
    GenericJournalSubmissionForm,
    GenericSubmissionForm,
    NewgroundsSubmissionForm,
    DerpibooruSubmissionForm,
    FurryAminoSubmissionForm,
    AryionSubmissionForm,
    PaigeeWorldSubmissionForm,
    SofurrySubmissionForm,
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
    E621SubmissionForm,
    FurAffinitySubmissionForm,
    GenericJournalSubmissionForm,
    GenericSubmissionForm,
    NewgroundsSubmissionForm,
    DerpibooruSubmissionForm,
    FurryAminoSubmissionForm,
    AryionSubmissionForm,
    PaigeeWorldSubmissionForm,
    SofurrySubmissionForm
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: INIT_WEBSITE_REGISTRY,
      deps: [
        E621,
        FurAffinity,
        Newgrounds,
        Route50,
        Weasyl,
        Derpibooru,
        Furiffic,
        FurryAmino,
        Aryion,
        PaigeeWorld,
        SoFurry
      ],
      multi: true
    }
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class WebsitesModule { }
