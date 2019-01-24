import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { UtilsModule } from '../utils/utils.module';

import {
  MatSelectModule,
  MatButtonModule,
  MatIconModule,
  MatMenuModule,
  MatDialogModule
} from '@angular/material';

import { LoginContainerComponent } from './components/login-container/login-container.component';
import { LoginStatusContainerComponent } from './components/login-status-container/login-status-container.component';
import { LoginStatusViewComponent } from './components/login-status-container/login-status-view/login-status-view.component';
import { LoginProfileSelectDialog } from './components/login-profile-select-dialog/login-profile-select-dialog.component';

@NgModule({
  declarations: [
    LoginContainerComponent,
    LoginStatusContainerComponent,
    LoginStatusViewComponent,
    LoginProfileSelectDialog
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UtilsModule,
    TranslateModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule
  ],
  exports: [
    LoginContainerComponent
  ],
  entryComponents: [
    LoginProfileSelectDialog
  ]
})
export class LoginModule { }
