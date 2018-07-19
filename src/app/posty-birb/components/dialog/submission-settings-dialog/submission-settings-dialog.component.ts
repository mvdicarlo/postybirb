import { Component } from '@angular/core';

@Component({
  selector: 'submission-settings-dialog',
  templateUrl: './submission-settings-dialog.component.html',
  styleUrls: ['./submission-settings-dialog.component.css']
})
export class SubmissionSettingsDialogComponent {

  public isStopAllSubmissionsEnabled(): boolean {
    const enabled = store.get('stopOnFailure');
    return enabled === undefined ? true : enabled;
  }

  public toggleStopOnFailure(event: any): void {
    store.set('stopOnFailure', event.checked);
  }

  public isGenerateErrorLogEnabled(): boolean {
    const enabled = store.get('generateLogOnFailure');
    return enabled === undefined ? true : enabled;
  }

  public toggleGenerateErrorLog(event: any): void {
    store.set('generateLogOnFailure', event.checked);
  }

}
