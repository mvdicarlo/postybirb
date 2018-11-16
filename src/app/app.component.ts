import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { UpdateService } from './commons/services/update/update.service';
import { PostManagerService } from './postybirb/services/post-manager/post-manager.service';
import { SchedulerService } from './postybirb/services/scheduler/scheduler.service';
import { MatDialog } from '@angular/material';
import { AgreementDialogComponent } from './miscellaneous/components/agreement-dialog/agreement-dialog.component';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  public version: string;
  public userLanguage: string = 'en';
  private knownLanguages: any = ['de', 'en', 'es', 'fi', 'fr', 'pt', 'ru'];

  @ViewChild('loginPanel') loginPanel: any;

  constructor(private translate: TranslateService, private router: Router, update: UpdateService, postManager: PostManagerService, scheduler: SchedulerService, private dialog: MatDialog, private _hotKeysService: HotkeysService) {
    this.version = appVersion;

    let userLanguage = window.navigator.language.split('-')[0];
    if (this.knownLanguages.indexOf(userLanguage) === -1) {
      userLanguage = 'en';
    }

    translate.setDefaultLang('en');
    translate.use(userLanguage);

    const storeLanguage = store.get('language');
    this.userLanguage = storeLanguage || userLanguage;
    this.translate.use(this.userLanguage);
  }

  ngAfterViewInit() {
    window['loginPanel'] = this.loginPanel;
    if (!store.get('licenseAgreement')) {
      this.dialog.open(AgreementDialogComponent, {
        closeOnNavigation: false,
        disableClose: true
      })
      .afterClosed()
      .subscribe(result => {
        if (result === true) {
          store.set('licenseAgreement', true);
        } else {
          window.close();
        }
      });
    }

    this._hotKeysService.add(new Hotkey('ctrl+l', (event: KeyboardEvent): boolean => {
      if (this.loginPanel) {
        this.loginPanel.toggle();
      }
      return false;
    }, undefined, 'Login'));

    this._hotKeysService.add(new Hotkey('ctrl+p', (event: KeyboardEvent): boolean => {
      this.router.navigate(['/postybirb'], { skipLocationChange: true });
      return false;
    }, undefined, 'Open PostyBirb'));

    this._hotKeysService.add(new Hotkey('ctrl+j', (event: KeyboardEvent): boolean => {
      this.router.navigate(['/journalbirb'], { skipLocationChange: true });
      return false;
    }, undefined, 'Open JournalBirb'));
  }

  public switchLanguage(language: string): void {
    this.translate.use(language);
    store.set('language', language);
  }

  public openURL(url: string): void {
    openUrlInBrowser(url);
  }

}
