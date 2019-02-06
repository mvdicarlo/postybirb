import { Component, OnInit, Inject } from '@angular/core';
import { Validators, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { ISubmission, SubmissionType } from 'src/app/database/tables/submission.table';

interface DialogOptions {
  title?: string;
  multiple?: boolean;
  type?: SubmissionType;
}

@Component({
  selector: 'submission-select-dialog',
  templateUrl: './submission-select-dialog.component.html',
  styleUrls: ['./submission-select-dialog.component.css']
})
export class SubmissionSelectDialog implements OnInit {
  public selectControl: FormControl = new FormControl(null, [Validators.required]);
  public options: ISubmission[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogOptions, private _submissionDB: SubmissionDBService) { }

  ngOnInit() {
    this._submissionDB.getISubmissions()
    .then(submissions => {
      this.options = submissions;

      if (this.data.type) {
        this.options = this.options.filter(s => s.submissionType === this.data.type);
      }
    });
  }

}
