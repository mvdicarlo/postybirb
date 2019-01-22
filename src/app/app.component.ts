import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public version: string;
  public userLanguage: string = 'en';
  private knownLanguages: any = ['en', 'es'];
  private readonly BASE_LANGUAGE: string = 'en';

  constructor(private _translate: TranslateService) {
    this.version = appVersion;
    _translate.setDefaultLang(this.BASE_LANGUAGE); // set default language pack to english
    this._initializeLanguage();
  }

  ngOnInit(): void {
  }

  /**
   * Set initial language pack depending on computer settings
   */
  private _initializeLanguage(): void {
    let userLanguage = window.navigator.language.split('-')[0];
    if (!this.knownLanguages.includes(userLanguage)) {
      userLanguage = this.BASE_LANGUAGE;
    }

    const storeLanguage = store.get('language');
    this.userLanguage = storeLanguage || userLanguage;
    this._translate.use(this.userLanguage);
  }

}
