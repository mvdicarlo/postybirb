import { Injectable } from '@angular/core';
import { MatBottomSheet } from '@angular/material';
import { SubmissionSheetComponent } from '../../components/sheets/submission-sheet/submission-sheet.component';
import { SnotifyService, SnotifyToast } from 'ng-snotify';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class ViewSubmissionsManagerService {
  private toast: SnotifyToast|any;

  constructor(private bottomSheet: MatBottomSheet, private snotify: SnotifyService, private translate: TranslateService) { }

  public openSheet(index: number = 0): void {
    this.bottomSheet.open(SubmissionSheetComponent, {
      data: { index },
      autoFocus: false
    });
  }

  public async askToOpenSheet() {
    if (!this.toast) {
      this.toast = true; // set it to something so that it can't double open
      this.translate.get(['View Submissions', 'Yes', 'No'])
      .subscribe(res => {
        this.toast = this.snotify.confirm(res['View Submissions'], {
          showProgressBar: true,
          timeout: 10000,
          buttons: [{
            text: res['Yes'],
            action: function(toast) {
              this.openSheet();
              this.snotify.remove(toast.id);
            }.bind(this)
          }, {
            text: res['No']
          }]
        });

        this.toast.on('beforeHide', function() {
          this.toast = null;
        }.bind(this));

        this.toast.on('destroyed', function() {
          this.toast = null;
        }.bind(this));
      });
    }
  }
}
