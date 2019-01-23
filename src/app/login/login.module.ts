import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TranslateModule } from '@ngx-translate/core';

import {
  MatSelectModule,
  MatButtonModule,
  MatIconModule,
  MatMenuModule,
  MatDialogModule
} from '@angular/material';

import { LoginContainerComponent } from './components/login-container/login-container.component';

@NgModule({
  declarations: [
    LoginContainerComponent
  ],
  imports: [
    CommonModule,
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
