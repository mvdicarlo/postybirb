import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { RouterModule } from '@angular/router';
import { PostybirbRoutes } from './postybirb.routes';

import { DatabaseModule } from '../database/database.module';
import { LoginModule } from '../login/login.module';
import { TemplatesModule } from '../templates/templates.module';
import { UtilsModule } from '../utils/utils.module';
import { WebsitesModule } from '../websites/websites.module';

import { TranslateModule } from '@ngx-translate/core';

import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';
import { HotkeyModule } from 'angular2-hotkeys';

import { ImageCropperModule } from 'ngx-image-cropper';
import { ScrollDispatchModule } from '@angular/cdk/scrolling';
import { DragDropModule } from '@angular/cdk/drag-drop';
import {
  MatBadgeModule,
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
  MatExpansionModule,
  MatIconModule,
  MatInputModule,
  MatMenuModule,
  MatProgressBarModule,
  MatRadioModule,
  MatSelectModule,
  MatSidenavModule,
  MatTabsModule,
  MatTooltipModule,
} from '@angular/material';

import { BaseSubmissionForm } from './forms/base-submission-form/base-submission-form.component';
import { BulkUpdateForm } from './forms/bulk-update-form/bulk-update-form.component';
import { CollectSubmissionInfoDialog } from './components/collect-submission-info-dialog/collect-submission-info-dialog.component';
import { ImageCropperDialog } from './components/image-cropper-dialog/image-cropper-dialog.component';
import { JournalForm } from './forms/journal-form/journal-form.component';
import { PostLogs } from './components/post-logs/post-logs.component';
import { PostybirbLayout } from './layouts/postybirb-layout/postybirb-layout.component';
import { SubmissionForm } from './forms/submission-form/submission-form.component';
import { SubmissionPostingViewComponent } from './components/submission-posting-view/submission-posting-view.component';
import { SubmissionRecordViewComponent } from './components/submission-record-view/submission-record-view.component';
import { SubmissionSelectDialog } from './components/submission-select-dialog/submission-select-dialog.component';
import { SubmissionTabComponent } from './components/submission-tab/submission-tab.component';
import { TemplateForm } from './forms/template-form/template-form.component';
import { AdditionalImageSplitDialog } from './components/additional-image-split-dialog/additional-image-split-dialog.component';
import { ImagePreviewDialog } from './components/image-preview-dialog/image-preview-dialog.component';
import { FileDropDialog } from './components/file-drop-dialog/file-drop-dialog.component';
import { LandingPage } from './pages/landing-page/landing-page.component';
import { LoginProfilePage } from './pages/login-profile-page/login-profile-page.component';

@NgModule({
  declarations: [
    BaseSubmissionForm,
    BulkUpdateForm,
    CollectSubmissionInfoDialog,
    ImageCropperDialog,
    JournalForm,
    PostLogs,
    PostybirbLayout,
    SubmissionForm,
    SubmissionPostingViewComponent,
    SubmissionRecordViewComponent,
    SubmissionSelectDialog,
    SubmissionTabComponent,
    TemplateForm,
    AdditionalImageSplitDialog,
    ImagePreviewDialog,
    FileDropDialog,
    LandingPage,
    LoginProfilePage,
  ],
  imports: [
    CommonModule,
    RouterModule.forRoot(PostybirbRoutes, { useHash: true }),
    ReactiveFormsModule,
    FormsModule,
    DatabaseModule,
    HotkeyModule,
    LoginModule,
    TemplatesModule,
    TranslateModule,
    UtilsModule,
    WebsitesModule,
    MatBadgeModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogModule,
    MatExpansionModule,
    MatIconModule,
    MatSidenavModule,
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
    ImageCropperModule
  ],
  exports: [
    PostybirbLayout,
  ],
  entryComponents: [
    AdditionalImageSplitDialog,
    CollectSubmissionInfoDialog,
    ImageCropperDialog,
    ImagePreviewDialog,
    SubmissionSelectDialog,
    FileDropDialog,
  ]
})
export class PostybirbModule { }
