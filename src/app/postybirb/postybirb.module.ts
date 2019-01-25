import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { RouterModule } from '@angular/router';
import { PostybirbRoutes } from './postybirb.routes';

import { UtilsModule } from '../utils/utils.module';
import { LoginModule } from '../login/login.module';

import { TranslateModule } from '@ngx-translate/core';

import {
  MatButtonModule,
  MatDialogModule,
  MatIconModule,
  MatInputModule,
  MatMenuModule,
  MatTabsModule,
  MatTooltipModule,
} from '@angular/material';

import { PostybirbLayout } from './layouts/postybirb-layout/postybirb-layout.component';
import { BulkUpdateForm } from './forms/bulk-update-form/bulk-update-form.component';

@NgModule({
  declarations: [
    PostybirbLayout,
    BulkUpdateForm
  ],
  imports: [
    CommonModule,
    RouterModule.forRoot(PostybirbRoutes, { useHash: true }),
    ReactiveFormsModule,
    LoginModule,
    UtilsModule,
    TranslateModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  exports: [
    PostybirbLayout
  ]
})
export class PostybirbModule { }
