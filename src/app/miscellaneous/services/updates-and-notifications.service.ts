import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SnotifyService } from 'ng-snotify';
import { TranslateService } from '@ngx-translate/core';
import { timer } from 'rxjs';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';

@Injectable({
  providedIn: 'root'
})
export class UpdatesAndNotificationsService {
  private version: string = appVersion;
  private readonly DOWNLOAD_URL: string = 'http://postybirb.com/download.html'
  private readonly UPDATES_URL: string = 'http://postybirb.com/version.html';

  constructor(private snotify: SnotifyService, private http: HttpClient, private translate: TranslateService) {
    timer(0, 12 * 60 * 60000).subscribe(this._checkForUpdate.bind(this));
  }

  private _checkForUpdate(): void {
    this.http.get(this.UPDATES_URL, { responseType: 'text' })
      .subscribe(html => {
        this._checkUpdates(html);
        this._checkPolls(html);
      });
  }

  private _checkUpdates(versionPage: string): void {
    const checkedVersion = HTMLParser.getInputValue(versionPage, 'version');
    const updates = HTMLParser.getInputValue(versionPage, 'updates');

    if (this.isNewVersion(checkedVersion)) {
      this.translate.get('Update Available').subscribe((res: string) => {
        let message: string = `(${res}: ${checkedVersion})`;
        this.snotify.confirm(message, {
          timeout: 7500,
          closeOnClick: true,
          buttons: [{
            text: 'Get',
            action: function(toast: any) {
              this._openDownload();
              this.snotify.remove(toast.id);
            }.bind(this)
          }]
        });
      });
    } else if (updates) {
      this.snotify.info(updates);
    }
  }

  private _checkPolls(versionPage: string): void {
    const poll = HTMLParser.getInputValue(versionPage, 'poll');
    const name = HTMLParser.getInputValue(versionPage, 'pollName');
    if (poll && store.get('LastPoll') !== name) {
      this.snotify.confirm(name, 'New Poll', {
        timeout: 12500,
        closeOnClick: true,
        buttons: [{
          text: 'Open',
          action: function(toast: any) {
            openUrlInBrowser(poll);
            this.snotify.remove(toast.id);
            store.set('LastPoll', name);
          }.bind(this)
        }, {
          text: 'No Thanks'
        }]
      });
    }
  }

  /**
 * @function isNewVersion
 * @description checks the current version of the app against the online value
 */
  private isNewVersion(newVersion: string): boolean {
    const current = this.version.split('.');
    const newer = (newVersion || '').split('.');
    let isUpdate: boolean = false;

    if (newer.length > 0) {
      for (let i = newer.length - 1; i >= 0; i--) {
        const currentVal = Number(current[i]);
        const newerVal = Number(newer[i]);

        if (newerVal > currentVal) {
          isUpdate = true;

        } else if (newerVal === currentVal) {

        } else {
          isUpdate = false;
        }
      }
    }

    return isUpdate;
  }

  private _openDownload() {
    openUrlInBrowser(this.DOWNLOAD_URL);
  }
}
