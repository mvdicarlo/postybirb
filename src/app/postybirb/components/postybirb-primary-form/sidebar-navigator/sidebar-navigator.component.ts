import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, AfterViewChecked } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material';
import { TemplatesService, Template } from '../../../services/templates/templates.service';
import { SubmissionViewComponent } from '../../dialog/submission-view/submission-view.component';
import { _copySubmission } from '../../../helpers/submission-manipulation.helper';
import { EditableSubmissionsService } from '../../../services/editable-submissions/editable-submissions.service';
import { SubmissionArchive, PostyBirbSubmissionModel } from '../../../models/postybirb-submission-model';
import { BulkUpdateService } from '../../../services/bulk-update/bulk-update.service';
import { debounceTime } from 'rxjs/internal/operators/debounceTime';
import { Store } from '@ngxs/store';
import { PostyBirbStateAction } from '../../../stores/states/posty-birb.state';

@Component({
  selector: 'sidebar-navigator',
  templateUrl: './sidebar-navigator.component.html',
  styleUrls: ['./sidebar-navigator.component.css'],
  host: {
    '(click)': '_scrollTo($event)'
  }
})
export class SidebarNavigatorComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input()
  get archive(): SubmissionArchive { return this._archive }
  set archive(archive: SubmissionArchive) {
    this._archive = archive;
    this.simpleForm.patchValue(archive.meta, { emitEvent: false });
  }
  private _archive: SubmissionArchive;

  @Input()
  get editMode(): string { return this._editMode }
  set editMode(mode: string) {
    this._editMode = mode;
    if (mode === 'single') {
      this._checkedForBulk(false);
    }
   }
  private _editMode: string = 'single';

  public submission: PostyBirbSubmissionModel;
  public templates: Template[] = [];
  public passing: boolean = true;
  public file: any;
  public fileIcon: any;
  public checkedForBulk: boolean = false;
  public checkedForEdit: boolean = false;

  public simpleForm: FormGroup;
  public isOpen: boolean = false;

  constructor(private templateService: TemplatesService, private dialog: MatDialog, private editableSubmissionService: EditableSubmissionsService,
    private _changeDetector: ChangeDetectorRef, private bulkUpdateService: BulkUpdateService, private _store: Store, fb: FormBuilder) {
      this.simpleForm = fb.group({
        rating: [null, Validators.required],
        title: [null, Validators.maxLength(50)]
      });

      this.simpleForm.controls.rating.valueChanges.subscribe(rating => {
        this.archive.meta.rating = rating;
        this._store.dispatch(new PostyBirbStateAction.UpdateSubmission(this.archive));
      });

      this.simpleForm.controls.title.valueChanges.pipe(debounceTime(500)).subscribe(title => {
        this.archive.meta.title = title;
        this._store.dispatch(new PostyBirbStateAction.UpdateSubmission(this.archive));
      });
    }

  ngOnInit() {
    this.editableSubmissionService.addNavigator(this.archive.meta.id, this);
    this.submission = PostyBirbSubmissionModel.fromArchive(this.archive);
    this.file = this.submission.getSubmissionFileObject();
    this._loadFileIconImage();
    this.checkedForEdit = this.editableSubmissionService.isEditing(this.archive.meta.id);
  }

  ngOnDestroy() {
    this.editableSubmissionService.removeNavigator(this.archive.meta.id);
  }

  ngAfterViewChecked() {
    this.passing = this.editableSubmissionService.isPassing(this.archive.meta.id);

    if (this.editMode === 'single') {
      if (this.file && this.file.path != this.archive.submissionFile.path) {
        this.submission = PostyBirbSubmissionModel.fromArchive(this.archive);
        this.file = this.submission.getSubmissionFileObject();
        this._loadFileIconImage();
      }
    }
  }

  private _loadFileIconImage(): void {
    if (this.file && this.file.type) {
      this.submission.getSubmissionFileIcon({
        height: 400,
        width: 200
      }).then(data => {
        this.fileIcon = data;
        this._changeDetector.markForCheck();
      });
    }
  }

  public trackBy(index, template: Template) {
    return template.name;
  }

  public trapEvent(event: Event): void {
    event.stopPropagation();
  }

  public async deleteItem() {
    this.editableSubmissionService.deleteForm(this.archive.meta.id);
  }

  public async saveSubmission() {
    this.editableSubmissionService.saveForm(this.archive.meta.id);
  }

  public async showSummary() {
      this.dialog.open(SubmissionViewComponent, {
        data: _copySubmission(PostyBirbSubmissionModel.fromArchive(this.archive)),
        width: '80%'
      });
  }

  public async applyTemplate(template: Template) {
    this.editableSubmissionService.applyTemplate(this.archive.meta.id, template.template);
    this.templates = [];
  }

  public async loadTemplates() {
    if (!this.templates.length) {
      this.templates = this.templateService.getTemplates();
    }
  }

  private _scrollTo(event: Event): void {
    event.stopPropagation();

    if (this.editMode === 'single') {
      this.editableSubmissionService.scrollToForm(this.archive.meta.id);
    }
  }

  public _checkedForBulk(checked: boolean) {
    this.checkedForBulk = checked;
    this.bulkUpdateService.selected(this.archive.meta.id, checked);
  }

  public _toggleChecked(checked: boolean): void {
    this.editableSubmissionService.toggleEditing(this.archive.meta.id, checked);
    this.checkedForEdit = checked;
  }

}
