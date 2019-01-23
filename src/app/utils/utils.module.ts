import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import {
  MatDialogModule,
  MatButtonModule,
  MatIconModule,
  MatInputModule
} from '@angular/material';

import { ConfirmDialog } from './components/confirm-dialog/confirm-dialog.component';
import { InputDialog } from './components/input-dialog/input-dialog.component';

@NgModule({
  declarations: [
    ConfirmDialog,
    InputDialog
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule
  ],
  exports: [
    ConfirmDialog,
    InputDialog
  ],
  entryComponents: [
    ConfirmDialog,
    InputDialog
  ]
})
export class UtilsModule { }
