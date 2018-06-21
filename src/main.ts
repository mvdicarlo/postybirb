import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

import * as store from 'store';
import * as expirePlugin from 'store/plugins/expire';
window['store'] = store;
store.addPlugin(expirePlugin);

platformBrowserDynamic().bootstrapModule(AppModule);
