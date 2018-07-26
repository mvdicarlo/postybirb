import { Component } from '@angular/core';

@Component({
  selector: 'submission-settings-dialog',
  templateUrl: './submission-settings-dialog.component.html',
  styleUrls: ['./submission-settings-dialog.component.css']
})
export class SubmissionSettingsDialogComponent {
  public interval: number = 0;

  constructor() {
    this.interval = Number(store.get('postInterval') || 0);
  }

  public isStopAllSubmissionsEnabled(): boolean {
    const enabled = store.get('stopOnFailure');
    return enabled === undefined ? true : enabled;
  }

  public toggleStopOnFailure(event: any): void {
    store.set('stopOnFailure', event.checked);
  }

  public isGenerateErrorLogEnabled(): boolean {
    const enabled = store.get('generateLogOnFailure');
    return enabled === undefined ? false : enabled;
  }

  public toggleGenerateErrorLog(event: any): void {
    store.set('generateLogOnFailure', event.checked);
  }

  public changePostInterval(interval: any): void {
    store.set('postInterval', interval || 0);
  }

  public isAdvertiseEnabled(): boolean {
    const enabled = store.get('globalAdvertise');
    return enabled === undefined ? true : enabled;
  }

  public toggleGlobalAdvertise(event: any): void {
    store.set('globalAdvertise', event.checked);
  }

}
