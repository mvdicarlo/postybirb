import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { UtilsModule } from '../utils/utils.module';

import {
  MatButtonModule,
  MatDialogModule,
  MatIconModule,
  MatInputModule,
  MatRadioModule,
  MatSelectModule
} from '@angular/material';

import { TemplateManagementDialog } from './components/template-management-dialog/template-management-dialog.component';
import { TemplateSelectDialog } from './components/template-select-dialog/template-select-dialog.component';

@NgModule({
  declarations: [
    TemplateManagementDialog,
    TemplateSelectDialog,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    UtilsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule
  ],
  exports: [

  ],
  entryComponents: [
    TemplateManagementDialog,
    TemplateSelectDialog,
  ]
})
export class TemplatesModule { }
