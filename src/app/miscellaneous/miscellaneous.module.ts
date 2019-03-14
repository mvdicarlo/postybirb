import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { TranslateModule } from '@ngx-translate/core';
import { UtilsModule } from '../utils/utils.module';

import {
  MatButtonModule,
  MatDialogModule,
  MatExpansionModule,
  MatIconModule,
  MatInputModule,
  MatSlideToggleModule,
  MatTabsModule,
} from '@angular/material';

import { SettingsDialog } from './dialogs/settings-dialog/settings-dialog.component';
import { AgreementDialog } from './dialogs/agreement-dialog/agreement-dialog.component';

@NgModule({
  declarations: [
    SettingsDialog,
    AgreementDialog
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    HttpClientModule,
    UtilsModule,
    MatButtonModule,
    MatDialogModule,
    MatExpansionModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTabsModule,
  ],
  exports: [
  ],
  entryComponents: [
    AgreementDialog,
    SettingsDialog,
  ]
})
export class MiscellaneousModule { }
