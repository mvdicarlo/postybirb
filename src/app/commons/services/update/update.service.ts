import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { HTMLParser } from '../../helpers/html-parser';
import { TranslateService } from '@ngx-translate/core';
import { timer } from 'rxjs/observable/timer';

/**
 * @description
 * Simple service that will query a hidden page on postybirb's website that holds some update
 * information that is displayed and current version for update checking
 *
 * @todo replace material notifier with something else because I hate the material notifications
 */
@Injectable()
export class UpdateService {
  private version: string;
  private updateURL: string = 'http://postybirb.com/download.html';
  private defaultNotifySettings: any = {
    duration: 10000,
    horizontalPosition: 'center',
    verticalPosition: 'top'
  };

  constructor(private snackBar: MatSnackBar, private translate: TranslateService) {
    this.version = window['appVersion'];
    timer(0, 30 * 60000).subscribe(this.checkForUpdate.bind(this));
  }

  private openDownload() {
    window['openUrlInBrowser']('http://postybirb.com/download.html');
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

  /**
   * @todo replace jquery with HttpClient
   */
  private checkForUpdate(): void {
    $.get('http://postybirb.com/version.html').done((versionPage) => {
      const checkedVersion = HTMLParser.getInputValue(versionPage, 'version');
      const updates = HTMLParser.getInputValue(versionPage, 'updates');
      if (this.isNewVersion(checkedVersion)) {
        this.translate.get('Update Available').subscribe((res: string) => {
          let message: string = `(${res}: ${checkedVersion})`;
          this.showNotification(`${message} ${updates}`, 'Get', this.defaultNotifySettings);
        });
      } else if (updates) {
        this.showNotification(updates, null, this.defaultNotifySettings);
      }
    }).fail(() => {
      const message = '(unable to check for update)';
      this.showNotification(message, null, this.defaultNotifySettings);
    });
  }

  private showNotification(message: string, action: string, configs: any): void {
    let snackbarRef = this.snackBar.open(message, action, configs);
    snackbarRef.onAction().subscribe(() => {
      this.openDownload();
    });
  }

}
