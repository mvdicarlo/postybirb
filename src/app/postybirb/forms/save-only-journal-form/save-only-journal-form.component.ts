import { Component, OnInit, forwardRef, ChangeDetectionStrategy, Injector } from '@angular/core';
import { getUnfilteredWebsites } from 'src/app/login/helpers/displayable-websites.helper';
import { JournalForm } from '../journal-form/journal-form.component';
import { ActivatedRoute } from '@angular/router';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';
import { TabManager } from '../../services/tab-manager.service';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { Submission } from 'src/app/database/models/submission.model';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { copyObject } from 'src/app/utils/helpers/copy.helper';
import { BaseSubmissionForm } from '../base-submission-form/base-submission-form.component';
import { SubmissionValidatorService } from 'src/app/websites/services/submission-validator.service';

@Component({
  selector: 'save-only-journal-form',
  templateUrl: './save-only-journal-form.component.html',
  styleUrls: ['./save-only-journal-form.component.css'],
  providers: [{ provide: BaseSubmissionForm, useExisting: forwardRef(() => SaveOnlyJournalForm) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SaveOnlyJournalForm extends JournalForm implements OnInit {

  private originalSubmission: Submission;

  constructor(
    injector: Injector,
    private _validator: SubmissionValidatorService,
    protected _route: ActivatedRoute,
    protected _submissionCache: SubmissionCache,
    protected _tabManager: TabManager,
    protected _submissionDB: SubmissionDBService
  ) {
    super(injector, _route, _submissionCache, _tabManager, _submissionDB);
  }

  ngOnInit() {
    this.loading = true;
    const availableWebsites = getUnfilteredWebsites() || {};
    const filteredWebsites: any = {};
    Object.keys(availableWebsites).forEach(key => {
      if (availableWebsites[key].websiteConfig.components.journalForm) {
        filteredWebsites[key] = availableWebsites[key];
      }
    });
    this.availableWebsites = filteredWebsites;

    this.originalSubmission = this._submissionCache.get(Number(this._route.snapshot.paramMap.get('id')));
    if (!this.originalSubmission) {
      this._tabManager.removeTab(Number(this._route.snapshot.paramMap.get('id')));
      return;
    }

    this.submission = new Submission(this.originalSubmission.asISubmission());
    this._initializeBasicInfoForm();
    this._initializeFormDataForm();

    // Disallow sudden scheduling
    if (!this.submission.schedule) {
      this.basicInfoForm.controls.schedule.disable();
    }
    this.basicInfoForm.controls.rating.valueChanges.subscribe(rating => {
      this._validator.validate(this.submission);
    });

    this.loading = false;
    this._changeDetector.markForCheck();
  }

  protected _formUpdated(changes: any): void {
    super._formUpdated(changes);
    this.validate();
  }

  private validate(): void {
    this._validator.validate(this.submission);
    this._changeDetector.markForCheck();
  }

  public save(): void {
    if (this.submission.problems.length) return;
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Save',
      }
    }).afterClosed()
      .subscribe(doSave => {
        if (doSave) {
          const { title, rating, schedule } = this.basicInfoForm.value;
          this.originalSubmission.title = title;
          this.originalSubmission.rating = rating;
          if (this.originalSubmission.schedule && schedule) {
            this.originalSubmission.schedule = schedule.getTime();
          }
          this.originalSubmission.formData = copyObject(this.formDataForm.value);
        }
      });
  }

}
