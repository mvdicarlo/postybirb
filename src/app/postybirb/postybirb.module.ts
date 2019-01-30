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

import { ScrollDispatchModule } from '@angular/cdk/scrolling';
import {
  MatButtonModule,
  MatDialogModule,
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

@NgModule({
  declarations: [
    PostybirbLayout,
    BulkUpdateForm,
    TemplateForm,
    CollectSubmissionInfoDialog,
    SubmissionRecordViewComponent,
    SubmissionForm,
    JournalForm,
    SubmissionTabComponent
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
    OwlNativeDateTimeModule
  ],
  exports: [
    PostybirbLayout
  ],
  entryComponents: [
    CollectSubmissionInfoDialog
  ]
})
export class PostybirbModule { }
