import { Component, OnInit, ChangeDetectionStrategy, AfterViewInit, forwardRef, OnDestroy, Injector } from '@angular/core';
import { Submission } from 'src/app/database/models/submission.model';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { SubmissionType, ISubmission } from 'src/app/database/tables/submission.table';
import { SubmissionSelectDialog } from '../../components/submission-select-dialog/submission-select-dialog.component';
import { BaseSubmissionForm } from '../base-submission-form/base-submission-form.component';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';
import { getUnfilteredWebsites } from 'src/app/login/helpers/displayable-websites.helper';

@Component({
  selector: 'bulk-update-form',
  templateUrl: './bulk-update-form.component.html',
  styleUrls: ['./bulk-update-form.component.css'],
  providers: [{ provide: BaseSubmissionForm, useExisting: forwardRef(() => BulkUpdateForm) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BulkUpdateForm extends BaseSubmissionForm implements OnInit, AfterViewInit, OnDestroy {
  protected readonly LOCAL_STORE: string = 'bulk-form-store';

  constructor(
    injector: Injector,
    private _submissionCache: SubmissionCache,
  ) {
    super(injector);
  }

  ngOnInit() {
    this.loading = true;
    this.availableWebsites = getUnfilteredWebsites() || {};
    this.submission = new Submission(<any>{ id: -1 }); // Create stub submission
    this.submission.formData = store.get(this.LOCAL_STORE) || {};
    this._initializeFormDataForm();

    this.loading = false;
    this._changeDetector.markForCheck();
  }

  protected _formUpdated(changes: any): void {
    store.set(this.LOCAL_STORE, changes);
  }

  public clear(): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Clear'
      }
    }).afterClosed()
      .subscribe(doClear => {
        if (doClear) {
          this.formDataForm.reset();
          this.resetSubject.next();
          store.remove(this.LOCAL_STORE);
        }
      });
  }

  public saveBulkUpdates(): void {
    this.loading = true;
    this.dialog.open(SubmissionSelectDialog, {
      data: {
        title: 'Save',
        type: SubmissionType.SUBMISSION,
        multiple: true
      }
    }).afterClosed()
      .subscribe((submissions: ISubmission[]) => {
        if (submissions && submissions.length) {
          submissions.forEach(submission => {
            this._submissionCache.get(submission.id).formData = JSON.parse(JSON.stringify(this.formDataForm.value));
          });
        }

        this.loading = false;
        this._changeDetector.markForCheck();
      });
  }

  public openCopySubmission(): void {
    this.dialog.open(SubmissionSelectDialog, {
      data: {
        title: 'Copy',
        type: SubmissionType.SUBMISSION
      }
    }).afterClosed()
      .subscribe((toCopy: ISubmission) => {
        if (toCopy) {
          this._copySubmission(toCopy);
        }
      });
  }

}
