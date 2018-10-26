import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import 'hammerjs';
import * as $ from 'jquery';

//Submodules
import { MiscellaneousModule } from './miscellaneous/miscellaneous.module';
import { CommonsModule } from './commons/commons.module';
import { JournalBirbModule } from './journal-birb/journal-birb.module';
import { PostybirbModule } from './postybirb/postybirb.module';
import { WebsiteLoginModule } from './website-login/website-login.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LogsModule } from './logs/logs.module';

import { SnotifyModule } from 'ng-snotify'; // imported for usage in root

import {
  MatButtonModule,
  MatIconModule,
  MatInputModule,
  MatSidenavModule,
  MatToolbarModule,
  MatTooltipModule,
  MatListModule,
  MatExpansionModule,
} from '@angular/material';

import { FullscreenOverlayContainer, OverlayContainer } from '@angular/cdk/overlay';
import { AppComponent } from './app.component';
import { SidebarComponent } from './sidebar/sidebar.component';

@NgModule({
  declarations: [
    AppComponent,
    SidebarComponent,
  ],
  imports: [
    RouterModule.forRoot([]),
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    MiscellaneousModule,
    DashboardModule,
    CommonsModule.forRoot(),
    PostybirbModule.forRoot(),
    LogsModule,
    JournalBirbModule,
    WebsiteLoginModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatToolbarModule,
    MatTooltipModule,
    MatSidenavModule,
    MatExpansionModule,
    MatListModule,
    HttpClientModule,
    SnotifyModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
  ],
  providers: [
    { provide: OverlayContainer, useClass: FullscreenOverlayContainer }
  ],
  bootstrap: [AppComponent],
  schemas: []
})
export class AppModule { }

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
