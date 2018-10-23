import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { UpdateService } from './commons/services/update/update.service';
import { PostManagerService } from './postybirb/services/post-manager/post-manager.service';
import { SchedulerService } from './postybirb/services/scheduler/scheduler.service';

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

  constructor(private translate: TranslateService, update: UpdateService, postManager: PostManagerService, scheduler: SchedulerService) {
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
  }

  public switchLanguage(language: string): void {
    this.translate.use(language);
    store.set('language', language);
  }

  public openURL(url: string): void {
    openUrlInBrowser(url);
  }

}
