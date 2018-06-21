import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material';
import { PostyBirbSubmission } from '../../../../commons/models/posty-birb/posty-birb-submission';
import { SupportedWebsites } from '../../../../commons/enums/supported-websites';
import { WebLogo } from '../../../../commons/enums/web-logo.enum';
import { SubmissionRuleHelpDialogComponent } from '../../dialog/submission-rule-help-dialog/submission-rule-help-dialog.component';

@Component({
  selector: 'save-dialog',
  templateUrl: './save-dialog.component.html',
  styleUrls: ['./save-dialog.component.css']
})
export class SaveDialogComponent {
  public websiteMap: any;
  public websiteKeys: string[];
  public invalid: any[];

  constructor(@Inject(MAT_DIALOG_DATA) public data: PostyBirbSubmission[], public dialogRef: MatDialogRef<SaveDialogComponent>, private dialog: MatDialog) {
    this.websiteMap = {};
    this.invalid = [];

    for (let i = 0; i < data.length; i++) {
      const submission: PostyBirbSubmission = data[i];

      if (submission.getUnpostedWebsites().length === 0) {
        this.invalid.push(submission);
        continue;
      }

      submission.getUnpostedWebsites().forEach(website => {
        if (this.websiteMap[website]) {
          this.websiteMap[website].push(submission);
        } else {
          this.websiteMap[website] = [submission];
        }
      });
    }

    this.websiteKeys = Object.keys(this.websiteMap);
  }

  public getLogo(website: string): string {
    return WebLogo[website];
  }

  public showHelp(): void {
    const dialogRef: MatDialogRef<SubmissionRuleHelpDialogComponent> = this.dialog.open(SubmissionRuleHelpDialogComponent);
  }

}
