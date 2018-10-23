import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { SnotifyService } from 'ng-snotify';
import { Observable } from 'rxjs';

@Injectable()
export class NotifyService {

  constructor(private snotify: SnotifyService, private translate: TranslateService) {
    snotify.setDefaults({
      toast: {
        timeout: 6000,
        showProgressBar: false,
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
