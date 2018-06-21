import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import {
  MatButtonModule,
  MatCardModule,
  MatIconModule
} from '@angular/material';

import { ApplicationDashboardComponent } from './main/application-dashboard/application-dashboard.component';

const routes: Routes = [
  { path: '', component: ApplicationDashboardComponent },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    CommonModule,
    TranslateModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ],
  declarations: [ApplicationDashboardComponent]
})
export class DashboardModule { }
