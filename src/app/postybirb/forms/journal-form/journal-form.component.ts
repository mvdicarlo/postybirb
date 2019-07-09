import { Component, OnInit, ChangeDetectionStrategy, AfterViewInit, forwardRef, OnDestroy, Injector } from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { TabManager } from '../../services/tab-manager.service';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { SubmissionType, ISubmission } from 'src/app/database/tables/submission.table';
import { SubmissionSelectDialog } from '../../components/submission-select-dialog/submission-select-dialog.component';
import { BaseSubmissionForm } from '../base-submission-form/base-submission-form.component';
import { getUnfilteredWebsites } from 'src/app/login/helpers/displayable-websites.helper';
import { WebsiteRegistryConfig } from 'src/app/websites/registries/website.registry';
import { Subscription } from 'rxjs';

@Component({
  selector: 'journal-form',
  templateUrl: './journal-form.component.html',
  styleUrls: ['./journal-form.component.css'],
  providers: [{ provide: BaseSubmissionForm, useExisting: forwardRef(() => JournalForm) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JournalForm extends BaseSubmissionForm implements OnInit, AfterViewInit, OnDestroy {
  private submissionChangeSubscription: Subscription = Subscription.EMPTY;''

  constructor(
    injector: Injector,
    private _route: ActivatedRoute,
    private _submissionCache: SubmissionCache,
    private _tabManager: TabManager,
    private _submissionDB: SubmissionDBService
  ) {
    super(injector);
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
    this.submission = this._submissionCache.get(Number(this._route.snapshot.paramMap.get('id')));

    if (!this.submission) {
      this._tabManager.removeTab(Number(this._route.snapshot.paramMap.get('id')));
      return;
    }

    this._initializeBasicInfoForm();
    this._initializeFormDataForm();

    this.submissionChangeSubscription = this.submission.changes.subscribe(change => {
      if (change.title) this.basicInfoForm.patchValue({ title: change.title.current }, { emitEvent: false });
      if (change.rating) this.basicInfoForm.patchValue({ rating: change.rating.current }, { emitEvent: false });
      if (change.schedule) this.basicInfoForm.patchValue({ schedule: change.schedule.current ? new Date(change.schedule.current) : null }, { emitEvent: false });
      if (change.copy && this.formDataForm) {
        this.formDataForm.patchValue(this.submission.formData || {}, { emitEvent: false });
      }
      this._changeDetector.markForCheck();
    });

    this.loading = false;
    this._changeDetector.markForCheck();
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.submissionChangeSubscription.unsubscribe();
  }

  private _initializeBasicInfoForm(): void {
    this.basicInfoForm = this._fb.group({
      title: [this.submission.title, Validators.maxLength(50)],
      rating: [this.submission.rating, Validators.required],
      schedule: [this.submission.schedule ? new Date(this.submission.schedule) : null]
    }, { updateOn: 'blur' });

    this.basicInfoForm.controls.title.valueChanges.subscribe(title => {
      this.submission.title = (title || '').trim();
    });

    this.basicInfoForm.controls.rating.valueChanges.subscribe(rating => {
      this.submission.rating = rating;
    });

    this.basicInfoForm.controls.schedule.valueChanges.subscribe((schedule: Date) => {
      this.submission.schedule = schedule ? schedule.getTime() : null;
    });
  }

  protected allowWebsite(config: WebsiteRegistryConfig): boolean {
    return config && !!config.websiteConfig.components.journalForm;
  }

  public clear(): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Clear'
      }
    }).afterClosed()
      .subscribe(doClear => {
        if (doClear) {
          this.basicInfoForm.reset();
          this.formDataForm.reset();
          this.formDataForm.patchValue({ loginProfile: this._loginProfileManager.getDefaultProfile().id });
        }
      });
  }

  public delete(): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete'
      }
    }).afterClosed()
      .subscribe(doDelete => {
        if (doDelete) {
          this.loading = true;
          this.submission.cleanUp();
          this._tabManager.removeTab(this.submission.id);
          this._submissionDB.delete([this.submission.id], this.submission.submissionType === SubmissionType.SUBMISSION);
          this._queueInserter.dequeue(this.submission);
        }
      });
  }

  public openCopySubmission(): void {
    this.dialog.open(SubmissionSelectDialog, {
      data: {
        title: 'Copy',
        type: SubmissionType.JOURNAL
      }
    })
      .afterClosed()
      .subscribe((toCopy: ISubmission) => {
        if (toCopy) {
          this._copySubmission(toCopy);
        }
      });
  }

}
