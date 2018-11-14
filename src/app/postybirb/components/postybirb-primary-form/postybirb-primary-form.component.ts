import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ViewChildren, QueryList, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { FormControl } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MatDialog, MatBottomSheet } from '@angular/material';

import { Select, Store } from '@ngxs/store';
import { PostyBirbStateAction } from '../../stores/states/posty-birb.state';

import { PostyBirbSubmissionModel, SubmissionArchive } from '../../models/postybirb-submission-model';
import { FileInformation } from '../../../commons/models/file-information';
import { ConfirmDialogComponent } from '../../../commons/components/confirm-dialog/confirm-dialog.component';
import { SubmissionSheetComponent } from '../sheets/submission-sheet/submission-sheet.component';

import { SubmissionEditingFormComponent } from '../submission-editing-form/submission-editing-form.component';
import { SubmissionSaveDialogComponent } from '../dialog/submission-save-dialog/submission-save-dialog.component';
import { _trimSubmissionFields } from '../../helpers/submission-manipulation.helper';

@Component({
  selector: 'postybirb-primary-form',
  templateUrl: './postybirb-primary-form.component.html',
  styleUrls: ['./postybirb-primary-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('flyInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }),
        animate(450, style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate(450, style({ transform: 'translateX(100%)', opacity: '0' }))
      ])
    ])
  ]
})
export class PostybirbPrimaryFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('fileInput') fileInput: ElementRef;
  @ViewChildren(SubmissionEditingFormComponent) submissionForms: QueryList<SubmissionEditingFormComponent>;

  @Select(state => state.postybirb.editing) editing$: Observable<SubmissionArchive>;

  public submissions: SubmissionArchive[] = [];
  public searchControl: FormControl = new FormControl();
  private stateSubscription: Subscription = Subscription.EMPTY;

  constructor(private _store: Store, private _changeDetector: ChangeDetectorRef, private dialog: MatDialog, private bottomSheet: MatBottomSheet) {
    this.stateSubscription = _store.select(state => state.postybirb.editing).subscribe(editing => {
      this.submissions = editing || [];
      this._changeDetector.markForCheck();
    });
  }

  ngOnInit() {
    this.searchControl.valueChanges.pipe(debounceTime(150)).subscribe(value => {
      const filter = value.toLowerCase().trim();
      this.getSubmissionNavbarItems().forEach(item => {
        item.hidden = filter;
      });

      this._changeDetector.markForCheck();
    });
  }

  ngAfterViewInit() {
    this.submissionForms.changes.pipe(debounceTime(150)).subscribe(() => this._changeDetector.markForCheck());
  }

  ngOnDestroy() {
    this.stateSubscription.unsubscribe();
  }

  public getSubmissionNavbarItems(): SubmissionEditingFormComponent[] {
    return this.submissionForms ? this.submissionForms.toArray() : [];
  }

  public async filesSelected(event: Event) {
    event.stopPropagation();
    const files: File[] = event.target['files'];

    const convertedList: File[] = [];
    for (let i = 0; i < files.length; i++) {
      convertedList.push(files[i]);
    }

    this._createSubmissions(convertedList)
    this.fileInput.nativeElement.value = '';
  }

  public async fileDrop(event: DragEvent) {
    event.stopPropagation()
    event.preventDefault();
    const fileList: FileList = event.dataTransfer.files;
    const files: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      files.push(fileList[i]);
    }

    this._createSubmissions(files);
    event.dataTransfer.clearData();
  }

  public copyFromClipboard(): void {
    const { availableFormats, content } = getClipboardContents();

    if (availableFormats.includes('image/png')) {
      const buffer = content.toJPEG(100);

      const fileInfo: FileInformation = new FileInformation(buffer, true);
      const pbs: PostyBirbSubmissionModel = new PostyBirbSubmissionModel(fileInfo);
      this._store.dispatch(new PostyBirbStateAction.EditSubmission(pbs.asSubmissionArchive(), false));
    }
  }

  public enableClipboardCopy(): boolean {
    return getClipboardFormats().includes('image/png');
  }

  public check(): void {
    this._changeDetector.markForCheck();
  }

  private _createSubmissions(files: File[]): void {
    const newSubmissions = files.filter(file => file.size <= 200000000).map(file => {
      return new PostyBirbSubmissionModel(new FileInformation(file, false));
    });

    this._store.dispatch(newSubmissions.map(s => new PostyBirbStateAction.EditSubmission(s.asSubmissionArchive(), false)))
  }

  public trackBy(index, item: SubmissionArchive) {
    return item.meta.id;
  }

  public trackBySidenav(index, item: SubmissionEditingFormComponent) {
    return item.archive.meta.id;
  }

  public async deleteAll() {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete All' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this._store.dispatch(this.submissions.map(s => new PostyBirbStateAction.DeleteSubmission(s)));
      }
    });
  }

  public async saveAllValid() {
    if (!this.canSaveMany()) return;
    const data: PostyBirbSubmissionModel[] = this.submissionForms.toArray()
      .filter(form => form.passing)
      .map(form => {
        return form._updateSubmission(form.submission);
      });

    let dialogRef = this.dialog.open(SubmissionSaveDialogComponent, {
      data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this._store.dispatch(data.map(submission => new PostyBirbStateAction.AddSubmission(_trimSubmissionFields(submission, submission.unpostedWebsites).asSubmissionArchive(), true)));
        this.bottomSheet.open(SubmissionSheetComponent, {
          data: { index: 0 }
        });
      }
    });
  }

  public canSaveMany(): boolean {
    if (this.submissionForms && this.submissionForms.length) {
      const forms = this.submissionForms.toArray();
      for (let i = 0; i < forms.length; i++) {
        if (forms[i].passing) {
          return true;
        }
      }
    }

    return false;
  }

  public hasIncomplete(): boolean {
    if (this.canSaveMany()) {
      const forms = this.submissionForms.toArray();
      for (let i = 0; i < forms.length; i++) {
        if (!forms[i].passing) {
          return true;
        }
      }
    }

    return false;
  }

}
