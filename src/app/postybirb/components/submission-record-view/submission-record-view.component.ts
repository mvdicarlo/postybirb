import { Component, OnInit, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Submission } from 'src/app/database/models/submission.model';

@Component({
  selector: 'submission-record-view',
  templateUrl: './submission-record-view.component.html',
  styleUrls: ['./submission-record-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubmissionRecordViewComponent implements OnInit {
  @Input() submission: Submission;
  public form: FormGroup;

  constructor(private _changeDetector: ChangeDetectorRef, fb: FormBuilder) {
    this.form = fb.group({
      title: [null],
      rating: [null, Validators.required],
      schedule: [null]
    });
  }

  ngOnInit() {
    this.form.patchValue({
      title: this.submission.title,
      rating: this.submission.rating,
      schedule: this.submission.schedule
    }, { emitEvent: false });
  }

}
