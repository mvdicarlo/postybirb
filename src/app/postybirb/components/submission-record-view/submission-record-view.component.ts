import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Submission } from 'src/app/database/models/submission.model';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { MatDialog } from '@angular/material';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { SubmissionType, ISubmission } from 'src/app/database/tables/submission.table';
import { readFileMetadata } from 'src/app/utils/helpers/file-reader.helper';
import { SubmissionFileDBService } from 'src/app/database/model-services/submission-file.service';
import { TabManager } from '../../services/tab-manager.service';
import { Subscription } from 'rxjs';
import { asFileObject } from 'src/app/database/tables/submission-file.table';
import { InputDialog } from 'src/app/utils/components/input-dialog/input-dialog.component';
import { SubmissionSelectDialog } from '../submission-select-dialog/submission-select-dialog.component';
import { TemplateSelectDialog } from 'src/app/templates/components/template-select-dialog/template-select-dialog.component';
import { copyObject } from 'src/app/utils/helpers/copy.helper';
import { QueueInserterService } from '../../services/queue-inserter.service';
import { ImagePreviewDialog } from '../image-preview-dialog/image-preview-dialog.component';

@Component({
  selector: 'submission-record-view',
  templateUrl: './submission-record-view.component.html',
  styleUrls: ['./submission-record-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'd-block',
    '[class.failed]': 'submission && submission.failed'
  }
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
    private _queueInserter: QueueInserterService,
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
      this._changeDetector.markForCheck();
    });

    this.tabSubscriber = this._tabManager.tabChanges.subscribe(tabs => {
      this.editing = tabs.findIndex(t => t.id === this.submission.id) !== -1;
      this._changeDetector.markForCheck();
    });
  }

  ngOnDestroy() {
    this.tabSubscriber.unsubscribe();
  }

  private _copySubmission(submission: ISubmission): void {
    if (submission.formData) {
      this.submission.formData = copyObject(submission.formData || <any>{});
      this.submission.flagUpdate('copy');
    }
    if (submission.rating) this.submission.rating = submission.rating;
    this._changeDetector.markForCheck();
  }

  public changeFile(event: Event): void {
    event.stopPropagation()
    event.preventDefault();

    const files: File[] = event.target['files'];

    if (files && files.length) {
      this.loading = true;
      this.hideForReload = true;

      this._changeDetector.markForCheck();
      readFileMetadata(files[0])
        .then(data => {
          this._submissionFileDB.updateSubmissionFileById(this.submission.fileMap.PRIMARY, data)
            .then(() => {
              this.hideForReload = false;
              this.loading = false;
              this.submission.fileInfo = asFileObject(data.file);
              this.submission.flagUpdate('file');
              this._changeDetector.markForCheck();
            });
        });
    }

    this.fileChange.nativeElement.value = '';
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
          this._queueInserter.dequeue(this.submission);
          this.submission.cleanUp();
          if (this._tabManager.hasTab(this.submission.id)) this._tabManager.removeTab(this.submission.id);
          this._submissionDB.delete([this.submission.id], this.submission.submissionType === SubmissionType.SUBMISSION);
        }
      });
  }

  public duplicateSubmission(): void {
    this.dialog.open(InputDialog, {
      data: {
        title: 'Title',
        maxLength: 50,
        minLength: 0,
        startingValue: this.submission.title || ''
      }
    }).afterClosed()
      .subscribe(title => {
        if (!!title) {
          this.loading = true;
          this._changeDetector.markForCheck();
          this._submissionDB.duplicate(this.submission.id, title)
            .then(() => { })
            .catch((err) => { console.error(err) })
            .finally(() => {
              this.loading = false;
              this._changeDetector.markForCheck();
            });
        }
      });
  }

  public enablePosting(): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: this.submission.schedule ? 'Schedule' : 'Post'
      }
    }).afterClosed()
      .subscribe(result => {
        if (result) {
          this._queueInserter.queue(this.submission);
        }
      });
  }

  public hasAdditionalFiles(): boolean {
    if (this.submission.fileMap && this.submission.fileMap.ADDITIONAL) {
      if (this.submission.fileMap.ADDITIONAL.length) return true;
    }

    return false;
  }

  public loadTemplate(): void {
    this.dialog.open(TemplateSelectDialog)
      .afterClosed()
      .subscribe(template => {
        if (template) {
          if (template.data) this._copySubmission(<any>{ formData: template.data });
          this._changeDetector.markForCheck();
        }
      });
  }

  public openCopySubmission(): void {
    this.dialog.open(SubmissionSelectDialog, {
      data: {
        title: 'Copy',
        type: this.submission.submissionType
      }
    })
      .afterClosed()
      .subscribe((toCopy: ISubmission) => {
        if (toCopy) {
          this._copySubmission(toCopy);
        }
      });
  }

  public openPreview(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.dialog.open(ImagePreviewDialog, {
      data: this.submission.fileMap.PRIMARY,
      maxWidth: '100vw',
      maxHeight: '100vh',
      panelClass: 'transparent-dialog'
    });
  }

  public splitSubmission(): void {
    this.loading = true;
    this._changeDetector.markForCheck();
    this._queueInserter.splitSubmission(this.submission)
      .then(() => { })
      .catch((err) => { console.error(err) })
      .finally(() => {
        this.loading = false;
        this._changeDetector.markForCheck();
      });
  }

  public stopPosting(): void {
    this._queueInserter.dequeue(this.submission);
  }

  public toggleEditing(): void {
    if (this.editing) {
      this._tabManager.removeTab(this.submission.id);
    } else {
      this._tabManager.addTab(this.submission);
    }
  }

}
