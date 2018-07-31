import { Component } from '@angular/core';

@Component({
  selector: 'submission-settings-dialog',
  templateUrl: './submission-settings-dialog.component.html',
  styleUrls: ['./submission-settings-dialog.component.css']
})
export class SubmissionSettingsDialogComponent {
  public interval: number = 0;

  constructor() {
    this.interval = Number(db.get('postInterval').value() || 0);
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

}
