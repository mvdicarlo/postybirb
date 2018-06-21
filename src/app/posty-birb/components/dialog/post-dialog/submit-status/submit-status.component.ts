import { Component, OnInit, OnDestroy, EventEmitter, Input, Output, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { SupportedWebsites } from '../../../../../commons/enums/supported-websites';
import { WebLogo } from '../../../../../commons/enums/web-logo.enum';
import { WebsiteManagerService } from '../../../../../commons/services/website-manager/website-manager.service';
import { PostyBirbSubmission } from '../../../../../commons/models/posty-birb/posty-birb-submission';
import { PostyBirbSubmissionData } from '../../../../../commons/interfaces/posty-birb-submission-data.interface';

import { LoggerService } from '../../../../../logs/services/logger/logger.service';
import { LogName } from '../../../../../logs/enums/log-name.enum';

enum SubmitStatus {
  INITIALIZING = 'Initializing',
  POSTING = 'Posting',
  SUCCESS = 'Success',
  FAILURE = 'Failure'
}

@Component({
  selector: 'submit-status',
  templateUrl: './submit-status.component.html',
  styleUrls: ['./submit-status.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubmitStatusComponent implements OnInit, OnDestroy {
  @Input() data: PostyBirbSubmission;
  @Input() website: string;
  @Output() complete: EventEmitter<any> = new EventEmitter();
  public logo: string;
  public status: string;
  private wait: number;
  private timeout: any;

  constructor(private managerService: WebsiteManagerService, private logger: LoggerService, private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this.logo = WebLogo[this.website];
    this.status = SubmitStatus.INITIALIZING;

    if (this.website === SupportedWebsites.Furaffinity) {
      this.wait = 20000;
    } else if (this.website === SupportedWebsites.DeviantArt) {
      this.wait = 6000;
    } else {
      this.wait = 3000;
    }

    this.timeout = setTimeout(this.submit.bind(this), this.wait, this.data);
    this._changeDetector.markForCheck();
  }

  ngOnDestroy() {
    clearTimeout(this.timeout);
  }

  private submit(submission: PostyBirbSubmission): void {
    this.status = SubmitStatus.POSTING;
    this._changeDetector.markForCheck();

    this.managerService.post(this.website, submission).subscribe((success) => {
      this.status = SubmitStatus.SUCCESS;
      this.emit(true)
    }, (err) => {
      this.status = SubmitStatus.FAILURE;
      if (err.submission) {
        const sub: PostyBirbSubmissionData = Object.assign({}, err.submission);
        sub.submissionData = Object.assign({}, err.submission.submissionData);
        sub.submissionData = Object.assign({}, err.submission.submissionData);
        sub.submissionData.submissionFile = null;
        sub.submissionData.thumbnailFile = null;
        err.submission = sub;
      }

      if (!err.skipLog) this.logger.error(LogName.PB_REPORT_LOG, err, 'Post Failed For ' + this.website, true);
      this.emit(false);
    });
  }

  public getStatus(): string {
    return this.status;
  }

  private emit(status): void {
    this.complete.emit({ success: status, website: this.website });
    this._changeDetector.markForCheck();
  }

}
