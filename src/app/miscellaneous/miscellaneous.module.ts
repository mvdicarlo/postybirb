import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { UtilsModule } from '../utils/utils.module';

import {
  MatButtonModule,
  MatDialogModule,
  MatExpansionModule,
  MatIconModule,
  MatSlideToggleModule
} from '@angular/material';

import { SettingsDialog } from './dialogs/settings-dialog/settings-dialog.component';

@NgModule({
  declarations: [
    SettingsDialog
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    UtilsModule,
    MatButtonModule,
    MatDialogModule,
    MatExpansionModule,
    MatIconModule,
    MatSlideToggleModule
  ],
  exports: [
    SettingsDialog
  ],
  entryComponents: [
    SettingsDialog
  ]
})
export class MiscellaneousModule { }
