import { NgModule, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Weasyl } from './website-services/weasyl.service';

export function INIT_WEBSITE_REGISTRY(...args) {
  return () => {};
}

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    TranslateModule
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: INIT_WEBSITE_REGISTRY,
      deps: [
        Weasyl
      ],
      multi: true
    }
  ]
})
export class WebsitesModule { }
