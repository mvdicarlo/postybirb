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
  MatSelectModule
} from '@angular/material';

import { TemplateSelectDialog } from './components/template-select-dialog/template-select-dialog.component';
import { TemplateManagementDialog } from './components/template-management-dialog/template-management-dialog.component';

@NgModule({
  declarations: [
    TemplateSelectDialog,
    TemplateManagementDialog
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
    MatSelectModule
  ],
  exports: [
    TemplateSelectDialog,
    TemplateManagementDialog
  ],
  entryComponents: [
    TemplateSelectDialog,
    TemplateManagementDialog
  ]
})
export class TemplatesModule { }
