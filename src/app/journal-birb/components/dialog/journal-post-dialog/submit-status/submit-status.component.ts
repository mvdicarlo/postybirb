import { Component, OnInit, EventEmitter, Input, Output } from '@angular/core';
import { WebLogo } from '../../../../../commons/enums/web-logo.enum';
import { WebsiteManagerService } from '../../../../../commons/services/website-manager/website-manager.service';

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
  styleUrls: ['./submit-status.component.css']
})
export class SubmitStatusComponent implements OnInit {
  @Input() data: any;
  @Input() website: string;
  @Output() complete: EventEmitter<any> = new EventEmitter();
  public logo: string;
  public status: string;
  private wait: number = 3000;

  constructor(private managerService: WebsiteManagerService, private logger: LoggerService) { }

  ngOnInit() {
    this.logo = WebLogo[this.website];
    this.status = SubmitStatus.INITIALIZING;
    setTimeout(this.submit.bind(this), this.wait, this.data);
  }

  private submit(data: any): void {
    this.status = SubmitStatus.POSTING;

    this.managerService.postJournal(this.website, data.title, data.description, data.options).subscribe((success) => {
      this.status = SubmitStatus.SUCCESS;
      this.emit(true)
    }, (err) => {
      this.status = SubmitStatus.FAILURE;
      if (!err.skipLog) this.logger.error(LogName.JB_REPORT_LOST, err, 'Journal Post Failed', true);
      this.emit(false);
    });
  }

  private emit(status): void {
    this.complete.emit({ success: status, website: this.website });
  }
}
