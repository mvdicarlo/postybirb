import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Submission } from 'src/app/database/models/submission.model';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { MatDialog } from '@angular/material';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { SubmissionType } from 'src/app/database/tables/submission.table';
import { readFile } from 'src/app/utils/helpers/file-reader.helper';
import { SubmissionFileDBService } from 'src/app/database/model-services/submission-file.service';
import { TabManager } from '../../services/tab-manager.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'submission-record-view',
  templateUrl: './submission-record-view.component.html',
  styleUrls: ['./submission-record-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubmissionRecordViewComponent implements OnInit, OnDestroy {
  @Input() submission: Submission;
  @ViewChild('fileChange') fileChange: ElementRef;
  public form: FormGroup;
  public editing: boolean = false;
  public hideForReload: boolean = false; // need this to trick the pipe to refresh
  public loading: boolean = false;
  private tabSubscriber: Subscription = Subscription.EMPTY;

  constructor(private _changeDetector: ChangeDetectorRef,
    private _submissionCache: SubmissionCache,
    private _submissionDB: SubmissionDBService,
    private _submissionFileDB: SubmissionFileDBService,
    private _tabManager: TabManager,
    private dialog: MatDialog,
    fb: FormBuilder) {
    this.form = fb.group({
      title: [null],
      rating: [null, Validators.required],
      schedule: [null]
    }, { updateOn: 'blur' });
  }

  ngOnInit() {
    this.submission = this._submissionCache.store(this.submission); // ensure we have cached submission

    this.form.patchValue({
      title: this.submission.title,
      rating: this.submission.rating,
      schedule: this.submission.schedule ? new Date(this.submission.schedule) : null
    }, { emitEvent: false });

    this.form.controls.title.valueChanges.subscribe(title => {
      this.submission.title = (title || '').trim();
    });

    this.form.controls.rating.valueChanges.subscribe(rating => {
      this.submission.rating = rating;
    });

    this.form.controls.schedule.valueChanges.subscribe((schedule: Date) => {
      this.submission.schedule = schedule ? schedule.getTime() : null;
    });

    this.submission.changes.subscribe(change => {
      if (change.title) this.form.patchValue({ title: change.title.current }, { emitEvent: false });
      if (change.rating) this.form.patchValue({ rating: change.rating.current }, { emitEvent: false });
      if (change.schedule) this.form.patchValue({ schedule: change.schedule.current ? new Date(change.schedule.current) : null }, { emitEvent: false });
      if (change.fileInfo) this._changeDetector.markForCheck();
    });

    this.tabSubscriber = this._tabManager.tabChanges.subscribe(tabs => {
      this.editing = tabs.findIndex(t => t.id === this.submission.id) !== -1;
      this._changeDetector.markForCheck();
    });
  }

  ngOnDestroy() {
    this.tabSubscriber.unsubscribe();
  }

  public toggleEditing(): void {
    if (this.editing) {
      this._tabManager.removeTab(this.submission.id);
    } else {
      this._tabManager.addTab(this.submission);
    }
  }

  public deleteSubmission(): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete'
      }
    }).afterClosed()
      .subscribe(result => {
        if (result) {
          this.loading = true;
          this._changeDetector.markForCheck();
          this.submission.cleanUp();
          this._tabManager.removeTab(this.submission.id);
          this._submissionDB.delete([this.submission.id], this.submission.submissionType === SubmissionType.SUBMISSION);
        }
      });
  }

  public changeFile(event: Event): void {

    event.stopPropagation()
    event.preventDefault();

    const files: File[] = event.target['files'];

    if (files && files.length) {
      this.loading = true;
      this.hideForReload = true;
      
      this._changeDetector.markForCheck();
      readFile(files[0])
        .then(data => {
          this._submissionFileDB.updateSubmissionFileById(this.submission.fileMap.PRIMARY, data)
            .then(() => {
              this.hideForReload = false;
              this.loading = false;
              this.submission.flagUpdate('file');
              this._changeDetector.markForCheck();
            });
        });
    }

    this.fileChange.nativeElement.value = '';
  }

}
