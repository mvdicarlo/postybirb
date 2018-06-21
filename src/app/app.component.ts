import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { UpdateService } from './commons/services/update/update.service';
import { PostObserverService } from './posty-birb/services/post-observer/post-observer.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  public version: string;
  public showSidebar: boolean = false;
  private knownLanguages: any = ['en', 'es', 'fi', 'pt'];

  constructor(private translate: TranslateService, private update: UpdateService, private postObserver: PostObserverService) {

    this.version = window['appVersion'];

    let userLanguage = window.navigator.language.split('-')[0];
    if (this.knownLanguages.indexOf(userLanguage) === -1) {
      userLanguage = 'en';
    }

    translate.setDefaultLang('en');
    translate.use(userLanguage);

    const firstTime = store.get('init');
    if (!firstTime) {
      store.clearAll();
      store.set('init', true);
    }
  }

  public switchLanguage(language: string): void {
    this.translate.use(language);
  }

  public toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  public openURL(url: string): void {
    window['openUrlInBrowser'](url);
  }
}
