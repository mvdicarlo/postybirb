import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Submission } from 'src/app/database/models/submission.model';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';
import { MatDialog } from '@angular/material';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { TabManager } from '../../services/tab-manager.service';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { SubmissionType } from 'src/app/database/tables/submission.table';
import { LoginProfileSelectDialog } from 'src/app/login/components/login-profile-select-dialog/login-profile-select-dialog.component';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { debounceTime } from 'rxjs/operators';
import { WebsiteRegistry, WebsiteRegistryEntry } from 'src/app/websites/registries/website.registry';

@Component({
  selector: 'submission-form',
  templateUrl: './submission-form.component.html',
  styleUrls: ['./submission-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubmissionForm implements OnInit {
  public submission: Submission;
  public loading: boolean = false;
  public availableWebsites: WebsiteRegistryEntry = {};

  public basicInfoForm: FormGroup;
  public formDataForm: FormGroup;

  constructor(
    private _route: ActivatedRoute,
    private _changeDetector: ChangeDetectorRef,
    private fb: FormBuilder,
    private _submissionCache: SubmissionCache,
    private _tabManager: TabManager,
    private _submissionDB: SubmissionDBService,
    private _loginProfileManager: LoginProfileManagerService,
    private dialog: MatDialog
  ) { }

  async ngOnInit() {
    this.loading = true;
    this.availableWebsites = WebsiteRegistry.getRegistered() || {};
    this.submission = await this._submissionCache.getOrInitialize(Number(this._route.snapshot.paramMap.get('id')));
    this._initializeBasicInfoForm();
    this._initializeFormDataForm();

    this.loading = false;
    this._changeDetector.markForCheck();
  }

  private _initializeBasicInfoForm(): void {
    this.basicInfoForm = this.fb.group({
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

    this.submission.changes.subscribe(change => {
      if (change.title) this.basicInfoForm.patchValue({ title: change.title.current }, { emitEvent: false });
      if (change.rating) this.basicInfoForm.patchValue({ rating: change.rating.current }, { emitEvent: false });
      if (change.schedule) this.basicInfoForm.patchValue({ schedule: change.schedule.current ? new Date(change.schedule.current) : null }, { emitEvent: false });
    });
  }

  private _initializeFormDataForm(): void {
    this.formDataForm = this.fb.group({
      loginProfile: [this._loginProfileManager.getDefaultProfile().id, Validators.required],
      websites: [null, Validators.required],
      defaults: this.fb.group({
        tags: [null]
      })
    });

    this.formDataForm.patchValue(this.submission.formData);

    this.formDataForm.valueChanges
      .pipe(debounceTime(1000))
      .subscribe(changes => {
        this.submission.formData = changes;
      });
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
        }
      });
  }

  public toggleLogin(): void {
    loginPanel.toggle();
  }

  public openProfileSelect(): void {
    this.dialog.open(LoginProfileSelectDialog)
      .afterClosed()
      .subscribe(profile => {
        if (profile) {
          this.formDataForm.controls.loginProfile.setValue(profile.id);
          this._changeDetector.markForCheck();
        }
      });
  }

}
