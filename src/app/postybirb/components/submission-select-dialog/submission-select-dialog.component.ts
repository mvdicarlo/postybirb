import { Component, OnInit, Inject } from '@angular/core';
import { Validators, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { ISubmission, SubmissionType } from 'src/app/database/tables/submission.table';
import { Submission } from 'src/app/database/models/submission.model';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

interface DialogOptions {
  title?: string;
  multiple?: boolean;
  type?: SubmissionType;
  submissions?: Submission[]; // provided submissions to pick from - when empty this will get all submissions
  allowReorder?: boolean;
}

@Component({
  selector: 'submission-select-dialog',
  templateUrl: './submission-select-dialog.component.html',
  styleUrls: ['./submission-select-dialog.component.css']
})
export class SubmissionSelectDialog implements OnInit {
  public selectControl: FormControl = new FormControl(null, [Validators.required]);
  public reorderControl: FormControl = new FormControl(false);
  public options: ISubmission[] = [];
  public selected: any[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogOptions, private _submissionDB: SubmissionDBService) { }

  ngOnInit() {
    if (this.data.multiple && this.data.allowReorder) {
      this.selectControl.valueChanges.subscribe(selected => {
        this.selected = selected;
      });
    }

    if (this.data.submissions) {
      this.options = this.data.submissions.map(s => s.asISubmission());
      if (this.data.type) {
        this.options = this.options.filter(s => s.submissionType === this.data.type);
      }
    } else {
      this._submissionDB.getISubmissions()
        .then(submissions => {
          this.options = submissions;

          if (this.data.type) {
            this.options = this.options.filter(s => s.submissionType === this.data.type);
          }
        });
    }
  }

  public drop(event: CdkDragDrop<string[]>): any {
    moveItemInArray(this.selected, event.previousIndex, event.currentIndex);
  }

  public getReturn(): any {
    if (this.data.allowReorder) return this.selected;
    else return this.selectControl.value;
  }

  public selectAll(): void {
    this.selectControl.patchValue(this.options);
  }

}
