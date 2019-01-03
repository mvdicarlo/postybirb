import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { SnotifyService } from 'ng-snotify';
import { Observable } from 'rxjs';

@Injectable()
export class NotifyService {

  constructor(private snotify: SnotifyService, private translate: TranslateService) {
    snotify.setDefaults({
      global: {
        maxOnScreen: 5,
        // filterDuplicates: true not released yet for some reason
      },
      toast: {
        timeout: 6000,
        showProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true
      }
    });
  }

  public translateNotification(msg: string, value?: any): Observable<string> {
    return this.translate.get(msg, value);
  }

  public getNotify(): SnotifyService {
    return this.snotify;
  }

}
