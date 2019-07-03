import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

import { SnotifyService } from 'ng-snotify';
import { TranslateService } from '@ngx-translate/core';

import { LoginManagerService } from './login/services/login-manager.service';
import { UpdatesAndNotificationsService } from './miscellaneous/services/updates-and-notifications.service';

import { MatSelectChange, MatDialog, MatDialogRef } from '@angular/material';

import { SettingsDialog } from './miscellaneous/dialogs/settings-dialog/settings-dialog.component';
import { AgreementDialog } from './miscellaneous/dialogs/agreement-dialog/agreement-dialog.component';
import { Hotkey, HotkeysService } from 'angular2-hotkeys';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild('loginPanel') loginPanel: any;

  public version: string;
  public userLanguage: string = 'en';
  public knownLanguages: string[] = ['ar', 'de', 'en', 'es', 'fi', 'fr', 'th', 'it', 'ja', 'pt', 'ru', 'zh'];
  private readonly BASE_LANGUAGE: string = 'en';
  private settingsDialog: MatDialogRef<any>;


  constructor(
    private _translate: TranslateService,
    _loginManager: LoginManagerService,
    private _router: Router,
    private dialog: MatDialog,
    private _hotkeyService: HotkeysService,
    snotify: SnotifyService,
    updatesAndNotifications: UpdatesAndNotificationsService // instantiated just to initialize it
  ) {
    this.version = appVersion;
    _translate.setDefaultLang(this.BASE_LANGUAGE); // set default language pack to english
    this._initializeLanguage();

    snotify.setDefaults({
      global: {
        maxOnScreen: 5
      },
      toast: {
        timeout: 6000,
        showProgressBar: true,
        pauseOnHover: true,
        closeOnClick: true,
        titleMaxLength: 50
      }
    });
  }

  ngOnInit() {
    if (!store.get('LicenseAgreement')) {
      this.dialog.open(AgreementDialog, {
        closeOnNavigation: false,
        disableClose: true
      })
        .afterClosed()
        .subscribe(result => {
          if (result === true) {
            store.set('LicenseAgreement', true);
          } else {
            window.close();
          }
        });
    }

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
    this._hotkeyService.add(new Hotkey(['ctrl+shift+l', 'command+shift+l'], (event: KeyboardEvent) => {
      this.loginPanel.toggle();
      return false;
    }, undefined, 'Toggle Login panel.'));

    this._hotkeyService.add(new Hotkey(['ctrl+shift+s', 'command+shift+s'], (event: KeyboardEvent) => {
      this.openSettings();
      return false;
    }, undefined, 'Open Settings.'));
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
    if (this.settingsDialog) {
      this.settingsDialog.close();
      this.settingsDialog = null;
    } else {
      this.settingsDialog = this.dialog.open(SettingsDialog, {
        maxWidth: '100vw',
        maxHeight: '100vh',
        height: '100%',
        width: '100%',
      });

      this.settingsDialog.afterClosed()
        .subscribe(() => {
          this.settingsDialog = null;
        });
    }
  }

  public toggleCheatSheet(): void {
    this._hotkeyService.cheatSheetToggle.next();
  }

}
