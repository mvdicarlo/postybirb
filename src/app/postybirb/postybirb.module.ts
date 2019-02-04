import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { RouterModule } from '@angular/router';
import { PostybirbRoutes } from './postybirb.routes';

import { UtilsModule } from '../utils/utils.module';
import { LoginModule } from '../login/login.module';
import { DatabaseModule } from '../database/database.module';

import { TranslateModule } from '@ngx-translate/core';

import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';
import { EditorModule } from '@tinymce/tinymce-angular';

import { ScrollDispatchModule } from '@angular/cdk/scrolling';
import {
  MatButtonModule,
  MatDialogModule,
  MatCheckboxModule,
  MatChipsModule,
  MatIconModule,
  MatInputModule,
  MatMenuModule,
  MatProgressBarModule,
  MatRadioModule,
  MatSelectModule,
  MatTabsModule,
  MatTooltipModule,
} from '@angular/material';

import { PostybirbLayout } from './layouts/postybirb-layout/postybirb-layout.component';
import { BulkUpdateForm } from './forms/bulk-update-form/bulk-update-form.component';
import { TemplateForm } from './forms/template-form/template-form.component';
import { CollectSubmissionInfoDialog } from './components/collect-submission-info-dialog/collect-submission-info-dialog.component';
import { SubmissionRecordViewComponent } from './components/submission-record-view/submission-record-view.component';
import { SubmissionForm } from './forms/submission-form/submission-form.component';
import { JournalForm } from './forms/journal-form/journal-form.component';
import { SubmissionTabComponent } from './components/submission-tab/submission-tab.component';
import { TagInput } from './components/tag-input/tag-input.component';
import { DescriptionInput } from './components/description-input/description-input.component';
import { SaveTemplateDialog } from './components/description-input/save-template-dialog/save-template-dialog.component';
import { WebsiteShortcutsComponent } from './components/description-input/website-shortcuts/website-shortcuts.component';

@NgModule({
  declarations: [
    PostybirbLayout,
    BulkUpdateForm,
    TemplateForm,
    CollectSubmissionInfoDialog,
    SubmissionRecordViewComponent,
    SubmissionForm,
    JournalForm,
    SubmissionTabComponent,
    TagInput,
    DescriptionInput,
    SaveTemplateDialog,
    WebsiteShortcutsComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forRoot(PostybirbRoutes, { useHash: true }),
    ReactiveFormsModule,
    FormsModule,
    LoginModule,
    UtilsModule,
    DatabaseModule,
    TranslateModule,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    ScrollDispatchModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
    EditorModule
  ],
  exports: [
    PostybirbLayout
  ],
  entryComponents: [
    CollectSubmissionInfoDialog,
    SaveTemplateDialog
  ]
})
export class PostybirbModule { }
