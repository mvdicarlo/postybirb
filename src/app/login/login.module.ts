import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { UtilsModule } from '../utils/utils.module';

import {
  MatButtonModule,
  MatDialogModule,
  MatIconModule,
  MatMenuModule,
  MatSelectModule,
} from '@angular/material';

import { LoginContainerComponent } from './components/login-container/login-container.component';
import { LoginProfileSelectDialog } from './components/login-profile-select-dialog/login-profile-select-dialog.component';
import { LoginStatusContainerComponent } from './components/login-status-container/login-status-container.component';
import { LoginStatusViewComponent } from './components/login-status-container/login-status-view/login-status-view.component';
import { WebsiteFilterDialog } from './components/website-filter-dialog/website-filter-dialog.component';

@NgModule({
  declarations: [
    LoginContainerComponent,
    LoginProfileSelectDialog,
    LoginStatusContainerComponent,
    LoginStatusViewComponent,
    WebsiteFilterDialog
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UtilsModule,
    TranslateModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
  ],
  exports: [
    LoginContainerComponent
  ],
  entryComponents: [
    LoginProfileSelectDialog,
    WebsiteFilterDialog
  ]
})
export class LoginModule { }
