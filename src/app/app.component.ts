import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatSelectChange } from '@angular/material';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  public version: string;
  public userLanguage: string = 'en';
  public knownLanguages: string[] = ['en', 'es'];
  private readonly BASE_LANGUAGE: string = 'en';

  constructor(private _translate: TranslateService) {
    this.version = appVersion;
    _translate.setDefaultLang(this.BASE_LANGUAGE); // set default language pack to english
    this._initializeLanguage();
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

}
