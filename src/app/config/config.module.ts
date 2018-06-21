import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PostyBirbModule } from '../posty-birb/posty-birb.module';

import {
  MatButtonModule,
  MatCardModule,
  MatTooltipModule
} from '@angular/material';

import { AppConfigComponent } from './main/app-config/app-config.component';
import { PostybirbConfigComponent } from './components/postybirb-config/postybirb-config.component';

const routes: Routes = [
  { path: 'settings', component: AppConfigComponent },
];

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatTooltipModule,
    PostyBirbModule.forRoot(),
    TranslateModule,
    RouterModule.forChild(routes)
  ],
  declarations: [
    AppConfigComponent,
    PostybirbConfigComponent
  ]
})
export class ConfigModule { }
