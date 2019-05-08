import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, ErrorHandler } from '@angular/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

import { WebsitesModule } from './websites/websites.module';
import { LoginModule } from './login/login.module';
import { UtilsModule } from './utils/utils.module';
import { PostybirbModule } from './postybirb/postybirb.module';
import { DatabaseModule } from './database/database.module';
import { MiscellaneousModule } from './miscellaneous/miscellaneous.module';
import { TemplatesModule } from './templates/templates.module';

import { ErrorLoggerHandler } from './app.error.logger';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { SnotifyModule, SnotifyService, ToastDefaults } from 'ng-snotify';
import { HotkeyModule } from 'angular2-hotkeys';

import {
  MatButtonModule,
  MatDialogModule,
  MatIconModule,
  MatInputModule,
  MatSelectModule,
  MatSidenavModule,
  MatToolbarModule,
  MatTooltipModule,
} from '@angular/material';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    HotkeyModule.forRoot(),
    LoginModule,
    PostybirbModule,
    UtilsModule,
    TemplatesModule,
    DatabaseModule,
    MiscellaneousModule,
    WebsitesModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSidenavModule,
    MatToolbarModule,
    MatTooltipModule,
    SnotifyModule
  ],
  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy }, // try to avoid refresh issues with electron
    { provide: ErrorHandler, useClass: ErrorLoggerHandler },
    { provide: 'SnotifyToastConfig', useValue: ToastDefaults },
    SnotifyService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
