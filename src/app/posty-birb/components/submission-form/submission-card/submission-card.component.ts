import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { debounce } from 'rxjs/operators';

import { MatDialog } from '@angular/material';

import { FileInformation } from '../../../../commons/models/file-information';
import { PostyBirbSubmission, SubmissionArchive } from '../../../../commons/models/posty-birb/posty-birb-submission';
import { FileHandler } from '../../../models/file-handler';
import { SubmissionViewComponent } from '../../dialog/submission-view/submission-view.component';
import { AdditionalImageOrderingDialogComponent } from './additional-image-ordering-dialog/additional-image-ordering-dialog.component';
import { TemplatesService, Template } from '../../../services/templates/templates.service';

@Component({
  selector: 'submission-card',
  templateUrl: './submission-card.component.html',
  styleUrls: ['./submission-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubmissionCardComponent implements OnInit, OnDestroy {
  @Input() submission: SubmissionArchive;
  @Input() selected: boolean = false;

  @Output() onSelect: EventEmitter<any> = new EventEmitter();
  @Output() onDelete: EventEmitter<PostyBirbSubmission> = new EventEmitter();

  @ViewChild('changeFileInput') changeFileInput: ElementRef;
  @ViewChild('altImageInput') altImageInput: ElementRef;

  private subscription: Subscription = Subscription.EMPTY;
  private templateSubscription: Subscription = Subscription.EMPTY;

  public submissionForm: FormGroup;
  public file: any;
  public src: string;
  public interval: any;
  public altImageCount: number = 0;
  public fileIcon: string;
  public data: PostyBirbSubmission;

  public templates: Template[] = [];

  constructor(private fb: FormBuilder, private dialog: MatDialog, private templateService: TemplatesService, private _changeDetector: ChangeDetectorRef) {
    this.templateSubscription = this.templateService.asObserver().subscribe(templates => {
      this.templates = templates;
      this._changeDetector.markForCheck();
    });
  }

  ngOnInit() {
    this.data = PostyBirbSubmission.fromArchive(this.submission);
    this.file = this.data.getSubmissionFileObject();

    getFileIcon(this.file.path, (err, icon) => {
      this.fileIcon = 'data:image/jpeg;base64, ' + icon.toJPEG(100).toString('base64');
      this._changeDetector.detectChanges();
    });

    this.submissionForm = this.fb.group({
      title: [null, [Validators.maxLength(50)]],
      thumbnailFile: [new FileInformation(null, false)],
      submissionType: [FileHandler.getTypeByExtension(this.file), Validators.required],
      submissionRating: ['', Validators.required],
      schedule: []
    });

    this.initialize().then(() => {
      this.submissionForm.valueChanges.pipe(debounce(() => timer(250))).subscribe(values => {
        if (this.submissionForm.valid) {
          this.data.setTitle(values.title || 'New Submission');
          this.data.setThumbnailFile(values.thumbnailFile);
          this.data.setSubmissionType(values.submissionType);
          this.data.setSubmissionRating(values.submissionRating);
          this.data.setSchedule(values.schedule);
        }

        this._changeDetector.markForCheck();
      });
    });
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
    this.templateSubscription.unsubscribe();
    clearInterval(this.interval);
  }

  private async initialize(): Promise<any> {
    this.src = await this.data.getSubmissionFileSource();

    this.submissionForm.controls.title.patchValue(this.data.getTitle());
    this.submissionForm.controls.thumbnailFile.patchValue(this.data.getThumbnailFileObject());
    this.submissionForm.controls.submissionType.patchValue(this.data.getSubmissionType() || FileHandler.getTypeByExtension(this.file));
    this.submissionForm.controls.submissionRating.patchValue(this.data.getSubmissionRating());
    this.submissionForm.controls.schedule.patchValue(this.data.getSchedule());
    this._changeDetector.markForCheck();

    return;
  }

  public applyTemplate(template: Template) {
    const t = PostyBirbSubmission.fromArchive(template.template);
    this.data.setDefaultFields(t.getDefaultFields());
    this.data.setWebsiteFields(t.getWebsiteFields());
  }

  public indeterminateChange(indeterminate: boolean): void {
    this.emitSelected();
  }

  public onSelected(): void {
    this.selected = !this.selected;
    this.emitSelected();
  }

  public onDeleted(event: Event): void {
    this.emitDeleted();
  }

  public changeFile(event: Event): void {
    const files: File[] = event.target['files'];

    if (files.length > 0) {
      this.data.setSubmissionFile(new FileInformation(files[0], true));

      this.data.getSubmissionFileSource().then(src => {
        this.src = src
      });

      this.file = this.data.getSubmissionFileObject();
      this.submissionForm.controls.submissionType.patchValue(FileHandler.getTypeByExtension(this.file));

      getFileIcon(this.file.path, (err, icon) => {
        this.fileIcon = 'data:image/jpeg;base64, ' + icon.toJPEG(100).toString('base64');
      });
    }

    this.changeFileInput.nativeElement.value = '';
  }

  public addAltImages(event: Event): void {
    // Can't be bothered to validate each one
    const files: File[] = event.target['files'];
    const fileInfoList: FileInformation[] = [];

    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file: File = files[i];
        fileInfoList.push(new FileInformation(file, true));
      }
    }

    this.data.setAdditionalFiles(fileInfoList);

    this.altImageInput.nativeElement.value = '';
  }

  public getAltImageCount(): number {
    return this.data.getAdditionalFilesFileObjects().length;
  }

  public clearAdditionalImages(): void {
    this.data.setAdditionalFiles([]);
    this._changeDetector.markForCheck();
  }

  public showSummary(): void {
    this.dialog.open(SubmissionViewComponent, {
      data: this.data,
      width: '80%'
    });
  }

  public orderImages(): void {
    this.dialog.open(AdditionalImageOrderingDialogComponent, {
      data: this.data
    });
  }

  public select(selected: boolean = true): void {
    if (this.selected !== selected) {
      this.selected = selected;
      this.emitSelected();
    }
  }

  public removeThumbnail(): void {
    this.submissionForm.controls.thumbnailFile.patchValue(new FileInformation(null, false));
  }

  private emitSelected(): void {
    this._changeDetector.markForCheck();
    this.onSelect.emit({ data: this.data, selected: this.selected });
  }

  private emitDeleted(): void {
    if (this.data) {
      this.onDelete.emit(this.data);
      this.cleanForDelete();
    }
  }

  private cleanForDelete(): void {
    this.data = null;
    this.selected = false;
  }

}
