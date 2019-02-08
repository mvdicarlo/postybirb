import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import {
  MatDialogModule,
  MatButtonModule,
  MatIconModule,
  MatInputModule,
  MatProgressBarModule,
  MatCheckboxModule,
  MatChipsModule
} from '@angular/material';
import { EditorModule } from '@tinymce/tinymce-angular';

import { ConfirmDialog } from './components/confirm-dialog/confirm-dialog.component';
import { InputDialog } from './components/input-dialog/input-dialog.component';
import { ProfileNamePipe } from './pipes/profile-name.pipe';
import { ToBase64Pipe } from './pipes/to-base64.pipe';
import { SafePipe } from './pipes/safe.pipe';
import { LoadingOverlay } from './components/loading-overlay/loading-overlay.component';
import { TagInput } from './components/tag-input/tag-input.component';
import { DescriptionInput } from './components/description-input/description-input.component';
import { SaveTemplateDialog } from './components/description-input/save-template-dialog/save-template-dialog.component';
import { WebsiteShortcutsComponent } from './components/description-input/website-shortcuts/website-shortcuts.component';

@NgModule({
  declarations: [
    ConfirmDialog,
    InputDialog,
    ProfileNamePipe,
    ToBase64Pipe,
    SafePipe,
    LoadingOverlay,
    TagInput,
    DescriptionInput,
    SaveTemplateDialog,
    WebsiteShortcutsComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatChipsModule,
    EditorModule
  ],
  exports: [
    ConfirmDialog,
    InputDialog,
    ProfileNamePipe,
    ToBase64Pipe,
    SafePipe,
    LoadingOverlay,
    TagInput,
    DescriptionInput
  ],
  entryComponents: [
    ConfirmDialog,
    InputDialog,
    SaveTemplateDialog
  ]
})
export class UtilsModule { }
