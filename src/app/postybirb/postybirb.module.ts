import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { RouterModule } from '@angular/router';
import { PostybirbRoutes } from './postybirb.routes';

import { UtilsModule } from '../utils/utils.module';
import { LoginModule } from '../login/login.module';
import { DatabaseModule } from '../database/database.module';
import { WebsitesModule } from '../websites/websites.module';

import { TranslateModule } from '@ngx-translate/core';

import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';

import { ScrollDispatchModule } from '@angular/cdk/scrolling';
import { DragDropModule } from '@angular/cdk/drag-drop';
import {
  MatButtonModule,
  MatDialogModule,
  MatCheckboxModule,
  MatExpansionModule,
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
import { SubmissionSelectDialog } from './components/submission-select-dialog/submission-select-dialog.component';
import { BaseSubmissionForm } from './forms/base-submission-form/base-submission-form.component';
import { SubmissionPostingViewComponent } from './components/submission-posting-view/submission-posting-view.component';

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
    SubmissionSelectDialog,
    BaseSubmissionForm,
    SubmissionPostingViewComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forRoot(PostybirbRoutes, { useHash: true }),
    ReactiveFormsModule,
    FormsModule,
    LoginModule,
    UtilsModule,
    WebsitesModule,
    DatabaseModule,
    TranslateModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatExpansionModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    ScrollDispatchModule,
    DragDropModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
  ],
  exports: [
    PostybirbLayout,
  ],
  entryComponents: [
    CollectSubmissionInfoDialog,
    SubmissionSelectDialog
  ]
})
export class PostybirbModule { }
