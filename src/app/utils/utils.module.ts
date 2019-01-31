import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import {
  MatDialogModule,
  MatButtonModule,
  MatIconModule,
  MatInputModule,
  MatProgressBarModule
} from '@angular/material';

import { ConfirmDialog } from './components/confirm-dialog/confirm-dialog.component';
import { InputDialog } from './components/input-dialog/input-dialog.component';
import { ProfileNamePipe } from './pipes/profile-name.pipe';
import { ToBase64Pipe } from './pipes/to-base64.pipe';
import { SafePipe } from './pipes/safe.pipe';
import { LoadingOverlay } from './components/loading-overlay/loading-overlay.component';

@NgModule({
  declarations: [
    ConfirmDialog,
    InputDialog,
    ProfileNamePipe,
    ToBase64Pipe,
    SafePipe,
    LoadingOverlay
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule
  ],
  exports: [
    ConfirmDialog,
    InputDialog,
    ProfileNamePipe,
    ToBase64Pipe,
    SafePipe,
    LoadingOverlay
  ],
  entryComponents: [
    ConfirmDialog,
    InputDialog
  ]
})
export class UtilsModule { }
