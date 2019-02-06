import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Submission } from 'src/app/database/models/submission.model';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';
import { MatDialog } from '@angular/material';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { TabManager } from '../../services/tab-manager.service';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { SubmissionType, ISubmission } from 'src/app/database/tables/submission.table';
import { LoginProfileSelectDialog } from 'src/app/login/components/login-profile-select-dialog/login-profile-select-dialog.component';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { debounceTime } from 'rxjs/operators';
import { WebsiteRegistry, WebsiteRegistryEntry } from 'src/app/websites/registries/website.registry';
import { readFile } from 'src/app/utils/helpers/file-reader.helper';
import { SubmissionFileDBService } from 'src/app/database/model-services/submission-file.service';
import { SubmissionFileType } from 'src/app/database/tables/submission-file.table';
import { ModifiedReadFile } from '../../layouts/postybirb-layout/postybirb-layout.component';
import { MBtoBytes } from 'src/app/utils/helpers/file.helper';
import { SubmissionSelectDialog } from '../../components/submission-select-dialog/submission-select-dialog.component';

@Component({
  selector: 'submission-form',
  templateUrl: './submission-form.component.html',
  styleUrls: ['./submission-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubmissionForm implements OnInit {
  @ViewChild('thumbnailChange') thumbnailInput: ElementRef;

  public submission: Submission;
  public loading: boolean = false;
  public hideForReload: boolean = false;
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
    private _submissionFileDB: SubmissionFileDBService,
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
        description: [null],
        tags: [null]
      })
    });

    this.formDataForm.patchValue(this.submission.formData || {});

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

  public removeThumbnail(): void {
    this.loading = true;
    this.hideForReload = true;

    this._changeDetector.markForCheck();
    this._submissionFileDB.deleteSubmissionFileById(this.submission.fileMap.THUMBNAIL)
    .finally(() => {
      const fileMap = this.submission.fileMap;
      delete fileMap.THUMBNAIL;
      this.submission.fileMap = fileMap;

      this.hideForReload = false;
      this.loading = false;
      this._changeDetector.markForCheck();
    });
  }

  public updateThumbnail(event: Event): void {
    event.stopPropagation()
    event.preventDefault();

    const files: File[] = event.target['files'];

    if (files && files.length) {
      if (files[0].size > MBtoBytes(2)) {
        this.thumbnailInput.nativeElement.value = '';
        return;
      }

      this.loading = true;
      this.hideForReload = true;

      this._changeDetector.markForCheck();
      readFile(files[0])
        .then((data: ModifiedReadFile) => {
          if (this.submission.fileMap.THUMBNAIL) { // Update file
            this._submissionFileDB.updateSubmissionFileById(this.submission.fileMap.THUMBNAIL, data)
              .then(() => {
                this.hideForReload = false;
                this.loading = false;
                this._changeDetector.markForCheck();
              });
          } else { // Create first time db record

            this._submissionFileDB.createSubmissionFiles(this.submission.id, SubmissionFileType.THUMBNAIL_FILE, [data])
            .then(info => {
              const newMap = Object.assign({}, this.submission.fileMap);
              newMap.THUMBNAIL = info[0].id;
              this.submission.fileMap = newMap;
            })
            .catch(err => {
              console.error(err);
            })
            .finally(() => {
              this.hideForReload = false;
              this.loading = false;
              this._changeDetector.markForCheck();
            });
          }
        });
    }

    this.thumbnailInput.nativeElement.value = '';
  }

  public openCopySubmission(): void {
    this.dialog.open(SubmissionSelectDialog, {
      data: {
        title: 'Copy',
        type: SubmissionType.SUBMISSION
      }
    })
    .afterClosed()
    .subscribe((toCopy: ISubmission) => {
      if (toCopy) {
        this._copySubmission(toCopy);
      }
    });
  }

  private _copySubmission(submission: ISubmission): void {
    if (submission.formData) this.formDataForm.patchValue(submission.formData || {});
    if (submission.rating) this.basicInfoForm.patchValue({ rating: submission.rating });
    this._changeDetector.markForCheck();
  }

}
