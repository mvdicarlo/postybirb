import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import {
  MatButtonModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDialogModule,
  MatIconModule,
  MatInputModule,
  MatProgressBarModule,
  MatSelectModule,
  MatTooltipModule,
} from '@angular/material';
import { EditorModule } from '@tinymce/tinymce-angular';

import { ConfirmDialog } from './components/confirm-dialog/confirm-dialog.component';
import { DescriptionInput } from './components/description-input/description-input.component';
import { FolderSelect } from './components/folder-select/folder-select.component';
import { InputDialog } from './components/input-dialog/input-dialog.component';
import { LoadingOverlay } from './components/loading-overlay/loading-overlay.component';
import { ObjectURLPipe } from './pipes/object-url.pipe';
import { ProfileNamePipe } from './pipes/profile-name.pipe';
import { SafePipe } from './pipes/safe.pipe';
import { SaveTemplateDialog } from './components/description-input/save-template-dialog/save-template-dialog.component';
import { TagInput } from './components/tag-input/tag-input.component';
import { WebsiteShortcutsComponent } from './components/description-input/website-shortcuts/website-shortcuts.component';

@NgModule({
  declarations: [
    ConfirmDialog,
    DescriptionInput,
    FolderSelect,
    InputDialog,
    LoadingOverlay,
    ObjectURLPipe,
    ProfileNamePipe,
    SafePipe,
    SaveTemplateDialog,
    TagInput,
    WebsiteShortcutsComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTooltipModule,
    EditorModule
  ],
  exports: [
    DescriptionInput,
    FolderSelect,
    LoadingOverlay,
    ObjectURLPipe,
    ProfileNamePipe,
    SafePipe,
    TagInput,
  ],
  entryComponents: [
    ConfirmDialog,
    InputDialog,
    SaveTemplateDialog
  ]
})
export class UtilsModule { }
