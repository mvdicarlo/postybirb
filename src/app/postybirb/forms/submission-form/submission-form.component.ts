import { Component, OnInit, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit, forwardRef, OnDestroy, Injector } from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { TabManager } from '../../services/tab-manager.service';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { SubmissionType, ISubmission } from 'src/app/database/tables/submission.table';
import { readFileMetadata, FileMetadata } from 'src/app/utils/helpers/file-reader.helper';
import { SubmissionFileDBService } from 'src/app/database/model-services/submission-file.service';
import { SubmissionFileType } from 'src/app/database/tables/submission-file.table';
import { MBtoBytes, isImage } from 'src/app/utils/helpers/file.helper';
import { SubmissionSelectDialog } from '../../components/submission-select-dialog/submission-select-dialog.component';
import { getTypeOfSubmission } from '../../../utils/enums/type-of-submission.enum';
import { BaseSubmissionForm } from '../base-submission-form/base-submission-form.component';
import { getUnfilteredWebsites } from 'src/app/login/helpers/displayable-websites.helper';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';
import { ImageCropperDialog } from '../../components/image-cropper-dialog/image-cropper-dialog.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'submission-form',
  templateUrl: './submission-form.component.html',
  styleUrls: ['./submission-form.component.css'],
  providers: [{ provide: BaseSubmissionForm, useExisting: forwardRef(() => SubmissionForm) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubmissionForm extends BaseSubmissionForm implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('thumbnailChange') thumbnailInput: ElementRef;
  @ViewChild('additionalImageInput') additionalImageInput: ElementRef;
  private submissionChangeSubscription: Subscription = Subscription.EMPTY;

  constructor(
    injector: Injector,
    protected _route: ActivatedRoute,
    protected _submissionCache: SubmissionCache,
    protected _tabManager: TabManager,
    protected _submissionDB: SubmissionDBService,
    protected _submissionFileDB: SubmissionFileDBService,
  ) {
    super(injector);
  }

  ngOnInit() {
    this.loading = true;
    this.availableWebsites = getUnfilteredWebsites() || {};
    this.submission = this._submissionCache.get(Number(this._route.snapshot.paramMap.get('id')));

    if (!this.submission) {
      this._tabManager.removeTab(Number(this._route.snapshot.paramMap.get('id')));
      return;
    }

    this.typeOfSubmission = getTypeOfSubmission(this.submission.fileInfo);
    this._initializeBasicInfoForm();
    this._initializeFormDataForm();

    this.submissionChangeSubscription = this.submission.changes.subscribe(change => {
      if (change.title) this.basicInfoForm.patchValue({ title: change.title.current }, { emitEvent: false });
      if (change.rating) this.basicInfoForm.patchValue({ rating: change.rating.current }, { emitEvent: false });
      if (change.schedule) this.basicInfoForm.patchValue({ schedule: change.schedule.current ? new Date(change.schedule.current) : null }, { emitEvent: false });
      if (change.fileInfo) this.typeOfSubmission = getTypeOfSubmission(change.fileInfo.current);
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

  protected _initializeBasicInfoForm(): void {
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

  public addAdditionalImages(event: Event): void {
    event.stopPropagation()
    event.preventDefault();

    this.loading = true;
    this._changeDetector.markForCheck();

    const files: File[] = event.target['files'];

    if (files && files.length) {
      const loadPromises: Promise<FileMetadata>[] = [];
      for (let i = 0; i < files.length; i++) {
        if (files[i]) {
          loadPromises.push(readFileMetadata(files[i]));
        }
      }

      Promise.all(loadPromises)
        .then(results => {
          this.loading = false;
          this._changeDetector.markForCheck();
          this._submissionFileDB.createSubmissionFiles(this.submission.id, SubmissionFileType.ADDITIONAL_FILE, results)
            .then(info => {
              info.forEach(i => {
                this.submission.addAdditionalFile(i.id, i.fileInfo);
              });
            })
            .finally(() => {
              this.hideForReload = false;
              this.loading = false;
              this._changeDetector.markForCheck();
            });
        });
    } else {
      this.loading = false;
      this._changeDetector.markForCheck();
    }

    this.additionalImageInput.nativeElement.value = '';
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

  public canHaveAdditionalImages(decision: boolean): string[] {
    return WebsiteRegistry.getRegisteredAsArray().
      filter(entry => !!entry.websiteConfig.additionalFiles === decision)
      .map(entry => entry.websiteConfig.displayedName);
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

  public removeAdditionalImage(id: number): void {
    this.submission.removeAdditionalFile(id);
    this._submissionFileDB.deleteSubmissionFileById(id)
      .finally(() => {
        this._changeDetector.markForCheck();
      });
  }

  public removeThumbnail(): void {
    if (!this.submission.hasThumbnail()) return;
    this.loading = true;
    this.hideForReload = true;
    this._changeDetector.markForCheck();

    this._submissionFileDB.deleteSubmissionFileById(this.submission.fileMap.THUMBNAIL)
      .finally(() => {
        this.hideForReload = false;
        this.loading = false;
        this._changeDetector.markForCheck();
      });

    this.submission.setThumbnailFile(null);
  }

  public updateThumbnail(event: Event): void {
    event.stopPropagation()
    event.preventDefault();

    const files: File[] = event.target['files'];

    if (files && files.length) {
      if (files[0].size > MBtoBytes(5) || !isImage(files[0])) {
        this.thumbnailInput.nativeElement.value = '';
        return;
      }

      this.loading = true;
      this.hideForReload = true;

      this._changeDetector.markForCheck();
      readFileMetadata(files[0])
        .then((data: FileMetadata) => {
          this.dialog.open(ImageCropperDialog, {
            data: data.buffer,
            maxWidth: '100vw',
            maxHeight: '100vh',
            height: '100%',
            width: '100%',
          }).afterClosed()
            .subscribe(buffer => {
              if (buffer) {
                data.buffer = buffer;
                if (this.submission.hasThumbnail()) { // Update file
                  this._submissionFileDB.updateSubmissionFileById(this.submission.fileMap.THUMBNAIL, data, true)
                    .then(() => {
                      this.hideForReload = false;
                      this.loading = false;
                      this._changeDetector.markForCheck();
                    });
                } else { // Create first time db record
                  this._submissionFileDB.createSubmissionFiles(this.submission.id, SubmissionFileType.THUMBNAIL_FILE, [data])
                    .then(info => {
                      this.submission.setThumbnailFile(info[0].id);
                    })
                    .finally(() => {
                      this.hideForReload = false;
                      this.loading = false;
                      this._changeDetector.markForCheck();
                    });
                }
              } else {
                this.hideForReload = false;
                this.loading = false;
                this._changeDetector.markForCheck();
              }
            });
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

  public swapAdditionalImages(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.submission.swapAdditionalFileOrder(event.previousIndex, event.currentIndex);
    this._changeDetector.markForCheck();
  }

}
