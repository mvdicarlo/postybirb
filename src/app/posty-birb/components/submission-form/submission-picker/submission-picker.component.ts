import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { PostyBirbSubmission } from '../../../../commons/models/posty-birb/posty-birb-submission';

@Component({
  selector: 'submission-picker',
  templateUrl: './submission-picker.component.html',
  styleUrls: ['./submission-picker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubmissionPickerComponent implements OnChanges {
  @Input() submissions: PostyBirbSubmission[] = [];
  @Input() readOnly: boolean = false;
  @Input() height: string = '200px';
  @Input() website: string = null;
  @Output() selected: EventEmitter<PostyBirbSubmission[]> = new EventEmitter();

  public selectedSubmissions: PostyBirbSubmission[] = [];

  constructor() { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
      if (changes.submissions) {
        this.submissions = changes.submissions.currentValue;
        this.selectedSubmissions = this.selectedSubmissions.filter(s => this.hasSubmission(s));
      }
    }
  }

  public hasSubmission(submission: PostyBirbSubmission): boolean {
    for (let i = 0; i < this.submissions.length; i++) {
      const s = this.submissions[i];

      if (s.getId() === submission.getId()) {
        return true;
      }
    }

    return false;
  }

  public submissionSelected(submission: PostyBirbSubmission): void {
    if (this.readOnly) return;

    if (!this.isSelected(submission)) {
      this.selectedSubmissions.push(submission);
    } else {
      const index = this.selectedSubmissions.indexOf(submission);
      this.selectedSubmissions.splice(index, 1);
    }

    this.emit();
  }

  public isSelected(submission: PostyBirbSubmission): boolean {
    return this.selectedSubmissions.includes(submission);
  }

  private emit(): void {
    if (!this.readOnly) {
      this.selected.emit(this.selectedSubmissions);
    }
  }

}
