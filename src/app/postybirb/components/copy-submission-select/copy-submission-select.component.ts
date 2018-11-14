import { Component, OnDestroy, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Store } from '@ngxs/store';

import { SubmissionArchive } from '../../models/postybirb-submission-model';

interface Record {
  name: string;
  archive: SubmissionArchive;
}

@Component({
  selector: 'copy-submission-select',
  templateUrl: './copy-submission-select.component.html',
  styleUrls: ['./copy-submission-select.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.d-none]': 'submissions.length < 1',
    '[class.d-inline-block]': 'submissions.length >= 1'
  }
})
export class CopySubmissionSelectComponent implements OnInit, OnDestroy {
  @Output() readonly copy: EventEmitter<SubmissionArchive> = new EventEmitter();
  @Input() ignoreId: string; // id to ignore so doesn't suggest self
  @ViewChild('select') select: any;

  private stateSubscription: Subscription = Subscription.EMPTY;
  public submissions: Record[] = [];

  constructor(private _store: Store, private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this.stateSubscription = this._store.select(state => state.postybirb).pipe(debounceTime(100)).subscribe(submissions => {
      const allSubmissions: SubmissionArchive[] = [...submissions.editing, ...submissions.submissions]
      this.submissions = allSubmissions
        .filter((archive: SubmissionArchive) => archive.meta.id != this.ignoreId)
        .map((archive: SubmissionArchive) => {
          return {
            name: `${archive.meta.title} > ${archive.submissionFile.name}`,
            archive
          }
        });

      this._changeDetector.markForCheck();
    });
  }

  ngOnDestroy() {
    this.stateSubscription.unsubscribe();
  }

  public trackBy(index, item: Record) {
    return item.archive.meta.id;
  }

  public emit(archive: SubmissionArchive): void {
    this.copy.emit(archive);
  }

  public reset(): void {
    this.select.value = null;
  }

}
