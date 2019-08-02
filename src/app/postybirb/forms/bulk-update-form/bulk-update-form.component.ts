import { Component, OnInit, ChangeDetectionStrategy, AfterViewInit, forwardRef, OnDestroy, Injector } from '@angular/core';
import { Submission } from 'src/app/database/models/submission.model';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { SubmissionType, ISubmission } from 'src/app/database/tables/submission.table';
import { SubmissionSelectDialog } from '../../components/submission-select-dialog/submission-select-dialog.component';
import { BaseSubmissionForm } from '../base-submission-form/base-submission-form.component';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';
import { getUnfilteredWebsites } from 'src/app/login/helpers/displayable-websites.helper';
import { copyObject } from 'src/app/utils/helpers/copy.helper';

@Component({
  selector: 'bulk-update-form',
  templateUrl: './bulk-update-form.component.html',
  styleUrls: ['./bulk-update-form.component.css'],
  providers: [{ provide: BaseSubmissionForm, useExisting: forwardRef(() => BulkUpdateForm) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BulkUpdateForm extends BaseSubmissionForm implements OnInit, AfterViewInit, OnDestroy {
  protected readonly LOCAL_STORE: string = 'local-bulk-form-store';

  constructor(
    injector: Injector,
    private _submissionCache: SubmissionCache,
  ) {
    super(injector);
    if (store.get('bulk-form-store')) store.remove('bulk-form-store');
    if (store.get('pb-bulk-form-store')) store.remove('pb-bulk-form-store');
  }

  ngOnInit() {
    this.loading = true;
    this.availableWebsites = getUnfilteredWebsites() || {};
    this.submission = new Submission(<any>{ id: -1 }); // Create stub submission
    const storedSubmission: ISubmission = store.get(this.LOCAL_STORE);
    if (storedSubmission) {
      if (storedSubmission.formData) {
        this.submission.formData = storedSubmission.formData
      }

      if (storedSubmission.rating) {
        this.submission.rating = storedSubmission.rating;
      }
    }
    this._initializeBasicInfoForm();
    this._initializeFormDataForm();

    this.loading = false;
    this._changeDetector.markForCheck();
  }

  private _initializeBasicInfoForm(): void {
    this.basicInfoForm = this._fb.group({
      rating: [this.submission.rating],
    }, { updateOn: 'blur' });

    this.basicInfoForm.controls.rating.valueChanges.subscribe(rating => {
      this.submission.rating = rating;
      store.set(this.LOCAL_STORE, this.submission.asISubmission());
    });
  }

  protected _formUpdated(changes: any): void {
    super._formUpdated(changes);
    store.set(this.LOCAL_STORE, this.submission.asISubmission());
  }

  public clear(): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Clear'
      }
    }).afterClosed()
      .subscribe(doClear => {
        if (doClear) {
          this.submission = new Submission(<any>{ id: -1 }); // Create stub submission
          this.formDataForm.reset();
          store.remove(this.LOCAL_STORE);
          this.basicInfoForm.reset();
          this.formDataForm.patchValue({ loginProfile: this._loginProfileManager.getDefaultProfile().id });
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
            const s = this._submissionCache.get(submission.id)
            s.formData = copyObject(this.formDataForm.value);
            if (this.basicInfoForm.value.rating) {
              s.rating = this.basicInfoForm.value.rating;
            }
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
