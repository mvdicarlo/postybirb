import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

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

@NgModule({
  declarations: [
    LoginContainerComponent,
    LoginStatusContainerComponent,
    LoginStatusViewComponent
  ],
  imports: [
    CommonModule,
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
  ]
})
export class LoginModule { }
