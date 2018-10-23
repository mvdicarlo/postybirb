import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import {
  MatSnackBarModule
} from '@angular/material';

import { LoggerService } from './services/logger/logger.service';

@NgModule({
  imports: [
    CommonModule,
    MatSnackBarModule,
    TranslateModule
  ],
  declarations: []
})
export class LogsModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: LogsModule,
      providers: [LoggerService]
    }
  }
}
