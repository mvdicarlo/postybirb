import { NgModule, ModuleWithProviders } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import {
  MatButtonModule,
  MatCardModule,
  MatTableModule,
  MatSnackBarModule
} from '@angular/material';

import { LoggerService } from './services/logger/logger.service';
import { AppLogsComponent } from './main/app-logs/app-logs.component';
import { PostybirbPostLogsComponent } from './components/postybirb-post-logs/postybirb-post-logs.component';

const routes: Routes = [
  { path: 'logs', component: AppLogsComponent }
];

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatSnackBarModule,
    RouterModule.forChild(routes),
    TranslateModule
  ],
  declarations: [
    PostybirbPostLogsComponent,
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
