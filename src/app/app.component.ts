import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatSelectChange, MatDialog } from '@angular/material';
import { LoginManagerService } from './login/services/login-manager.service';
import { Router, NavigationEnd } from '@angular/router';
import { SettingsDialog } from './miscellaneous/dialogs/settings-dialog/settings-dialog.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild('loginPanel') loginPanel: any;

  public version: string;
  public userLanguage: string = 'en';
  public knownLanguages: string[] = ['en', 'es'];
  private readonly BASE_LANGUAGE: string = 'en';

  constructor(
    private _translate: TranslateService,
    _loginManager: LoginManagerService,
    private _router: Router,
    private dialog: MatDialog
  ) {
    this.version = appVersion;
    _translate.setDefaultLang(this.BASE_LANGUAGE); // set default language pack to english
    this._initializeLanguage();
  }

  ngOnInit() {
    // restore last known route
    if (store.get('lastRoute')) {
      this._router.navigateByUrl(store.get('lastRoute'));
    }

    // store most recent app route for app restarts
    this._router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        store.set('lastRoute', event.urlAfterRedirects);
      }
    });
  }

  ngAfterViewInit() {
    window['loginPanel'] = this.loginPanel;
  }

  /**
   * Set initial language pack depending on computer settings
   */
  private _initializeLanguage(): void {
    let userLanguage: string = window.navigator.language.split('-')[0];
    if (!this.knownLanguages.includes(userLanguage)) {
      userLanguage = this.BASE_LANGUAGE;
    }

    const storeLanguage: string = store.get('language');
    this.userLanguage = storeLanguage || userLanguage;
    this._translate.use(this.userLanguage);
  }

  public changeLanguage(event: MatSelectChange): void {
    const language: string = event.value;
    this._translate.use(language);
    store.set('language', language);
  }

  /**
   * Opens a URL in user's native/default browser
   * @param url URL to navigate to
   */
  public async openURL(url: string) {
    openUrlInBrowser(url);
  }

  public openSettings(): void {
    this.dialog.open(SettingsDialog, {
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%',
    });
  }

}
