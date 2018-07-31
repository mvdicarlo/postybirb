import { NgModule, ModuleWithProviders } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import {
  MatSnackBarModule
} from '@angular/material';

import { LoggerService } from './services/logger/logger.service';
import { AppLogsComponent } from './main/app-logs/app-logs.component';

const routes: Routes = [
  { path: 'logs', component: AppLogsComponent }
];

@NgModule({
  imports: [
    CommonModule,
    MatSnackBarModule,
    RouterModule.forChild(routes),
    TranslateModule
  ],
  declarations: [
    AppLogsComponent
  ]
})
export class LogsModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: LogsModule,
      providers: [LoggerService]
    }
  }
}
