import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  MatSnackBarModule
} from '@angular/material';

import { LoggerService } from './services/logger/logger.service';

@NgModule({
  imports: [
    CommonModule,
    MatSnackBarModule,
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
