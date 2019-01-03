import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material';
import { Subscription } from 'rxjs';
import { Store } from '@ngxs/store';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';

import { SubmissionSheetComponent } from '../sheets/submission-sheet/submission-sheet.component';
import { SubmissionSettingsDialogComponent } from '../dialog/submission-settings-dialog/submission-settings-dialog.component';
import { ManageTemplatesDialogComponent } from '../dialog/manage-templates-dialog/manage-templates-dialog.component';
import { SubmissionStatus } from '../../enums/submission-status.enum';

@Component({
  selector: 'postybirb-status-bar',
  templateUrl: './posty-birb-status-bar.component.html',
  styleUrls: ['./posty-birb-status-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostyBirbStatusBarComponent implements OnInit, OnDestroy {
  private submissionSubscription: Subscription = Subscription.EMPTY;

  public queueCount: number = 0;
  public submissionCount: number = 0;

  private templateDialog: MatDialogRef<any>;
  private settingsDialog: MatDialogRef<any>;
  private submissionsDialog: MatBottomSheetRef;

  constructor(private _store: Store, private bottomSheet: MatBottomSheet, private dialog: MatDialog, private _changeDetector: ChangeDetectorRef, private _hotKeysService: HotkeysService) { }

  ngOnInit() {
    this.submissionSubscription = this._store.select(state => state.postybirb.submissions).subscribe(submissions => {
      this.submissionCount = submissions.length;
      this.queueCount = submissions.filter(s => (s.meta.submissionStatus === SubmissionStatus.POSTING || s.meta.submissionStatus === SubmissionStatus.QUEUED)).length;
      this._changeDetector.markForCheck();
    });

    this._hotKeysService.add(new Hotkey('alt+v', (event: KeyboardEvent): boolean => {
      if (this.submissionsDialog) {
        this.submissionsDialog.dismiss();
        this.submissionsDialog = null;
      } else {
        this.openSubmissions();
      }
      return false;
    }, undefined, 'Open Submission View'));

    this._hotKeysService.add(new Hotkey('alt+s', (event: KeyboardEvent): boolean => {
      if (this.settingsDialog) {
        this.settingsDialog.close();
        this.settingsDialog = null;
      } else {
        this.openSettings();
      }
      return false;
    }, undefined, 'Open Settings'));

    this._hotKeysService.add(new Hotkey('alt+t', (event: KeyboardEvent): boolean => {
      if (this.templateDialog) {
        this.templateDialog.close();
        this.templateDialog = null;
      } else {
        this.openTemplateManager();
      }
      return false;
    }, undefined, 'Open Template Manager'));
  }

  ngOnDestroy() {
    this.submissionSubscription.unsubscribe();
  }

  public async openQueue() {
    this.bottomSheet.open(SubmissionSheetComponent, {
      data: { index: 2 },
      autoFocus: false
    });
  }

  public async openSubmissions() {
    this.submissionsDialog = this.bottomSheet.open(SubmissionSheetComponent, {
      data: { index: 0 }
    });

    this.submissionsDialog.afterDismissed().subscribe(() => this.submissionsDialog = null);
  }

  public async openSettings() {
    this.settingsDialog = this.dialog.open(SubmissionSettingsDialogComponent);
    this.settingsDialog.afterClosed().subscribe(() => this.settingsDialog = null);
  }

  public async openTemplateManager() {
    this.templateDialog = this.dialog.open(ManageTemplatesDialogComponent, { width: '50%' });
    this.templateDialog.afterClosed().subscribe(() => this.templateDialog = null);
  }

}
