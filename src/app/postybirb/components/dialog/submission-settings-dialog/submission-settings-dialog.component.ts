import { Component, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material';
import { Subscription } from 'rxjs';
import { Store } from '@ngxs/store';
import { PostyBirbStateAction } from '../../../stores/states/posty-birb.state';
import { ConfirmDialogComponent } from '../../../../commons/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'submission-settings-dialog',
  templateUrl: './submission-settings-dialog.component.html',
  styleUrls: ['./submission-settings-dialog.component.css']
})
export class SubmissionSettingsDialogComponent implements OnDestroy {
  public interval: number = 0;
  private submissions: any = null;
  private subscription: Subscription = Subscription.EMPTY;

  constructor(private _store: Store, private dialog: MatDialog) {
    this.interval = Number(db.get('postInterval').value() || 0);
    this.subscription = _store.select(state => state.postybirb.submissions).subscribe(submissions => this.submissions = submissions);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  public isHardwareAccelerationOn(): boolean {
    const enabled = db.get('hardwareAcceleration').value();
    return enabled === undefined ? false : enabled;
  }

  public toggleHardwareAccceleration(event: any): void {
    if (event.checked == this.isHardwareAccelerationOn()) return;

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Hardware Acceleration',
        option: 'Changing this setting will require PostyBirb to restart.'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        db.set('hardwareAcceleration', event.checked).write();
        setTimeout(relaunch, 1000);
      }
    });
  }

  public isStopAllSubmissionsEnabled(): boolean {
    const enabled = db.get('stopOnFailure').value();
    return enabled === undefined ? true : enabled;
  }

  public toggleStopOnFailure(event: any): void {
    db.set('stopOnFailure', event.checked).write();
  }

  public isGenerateErrorLogEnabled(): boolean {
    const enabled = db.get('generateLogOnFailure').value();
    return enabled === undefined ? false : enabled;
  }

  public toggleGenerateErrorLog(event: any): void {
    db.set('generateLogOnFailure', event.checked).write();
  }

  public changePostInterval(interval: any): void {
    db.set('postInterval', interval || 0).write();
  }

  public isAdvertiseEnabled(): boolean {
    const enabled = db.get('globalAdvertise').value();
    return enabled === undefined ? true : enabled;
  }

  public toggleGlobalAdvertise(event: any): void {
    db.set('globalAdvertise', event.checked).write();
  }

  public resetScheduled(): void {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete All' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this._store.dispatch(this.submissions.filter(s => s.meta.schedule).map(s => new PostyBirbStateAction.DeleteSubmission(s)));
      }
    });
  }

  public resetUnscheduled(): void {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete All' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this._store.dispatch(this.submissions.filter(s => !s.meta.schedule).map(s => new PostyBirbStateAction.DeleteSubmission(s)));
      }
    });
  }

}
