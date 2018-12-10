import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, AfterViewChecked } from '@angular/core';
import { MatDialog } from '@angular/material';
import { TemplatesService, Template } from '../../../services/templates/templates.service';
import { SubmissionViewComponent } from '../../dialog/submission-view/submission-view.component';
import { _copySubmission } from '../../../helpers/submission-manipulation.helper';
import { EditableSubmissionsService } from '../../../services/editable-submissions/editable-submissions.service';
import { SubmissionArchive, PostyBirbSubmissionModel } from '../../../models/postybirb-submission-model';
import { BulkUpdateService } from '../../../services/bulk-update/bulk-update.service';

@Component({
  selector: 'sidebar-navigator',
  templateUrl: './sidebar-navigator.component.html',
  styleUrls: ['./sidebar-navigator.component.css'],
  host: {
    '(click)': '_scrollTo($event)',
    '[class.d-none]': 'hide',
    '(mouseenter)': '_toggleHighlight()',
    '(mouseleave)': '_toggleHighlight()'
  }
})
export class SidebarNavigatorComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() archive: SubmissionArchive;

  @Input()
  get editMode(): string { return this._editMode }
  set editMode(mode: string) {
    this._editMode = mode;
    if (mode === 'single') {
      this._checkedForBulk(false);
    }

    if (mode === 'bulk') {
      this.hide = false;
    }
   }
  private _editMode: string = 'single';

  public submission: PostyBirbSubmissionModel;
  public templates: Template[] = [];
  public hide: boolean = true;
  public passing: boolean = true;
  public file: any;
  public fileIcon: any;
  public checkedForBulk: boolean = false;

  constructor(private templateService: TemplatesService, private dialog: MatDialog, private editableSubmissionService: EditableSubmissionsService,
    private _changeDetector: ChangeDetectorRef, private bulkUpdateService: BulkUpdateService,) { }

  ngOnInit() {
    this.editableSubmissionService.addNavigator(this.archive.meta.id, this);
    this.submission = PostyBirbSubmissionModel.fromArchive(this.archive);
    this.file = this.submission.getSubmissionFileObject();
    this._loadFileIconImage();
  }

  ngOnDestroy() {
    this.editableSubmissionService.removeNavigator(this.archive.meta.id);
  }

  ngAfterViewChecked() {
    if (this.editMode === 'single') {
      this.hide = this.editableSubmissionService.isFiltered(this.archive.meta.id);
      this.passing = this.editableSubmissionService.isPassing(this.archive.meta.id);
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
    const item = this.editableSubmissionService.getForm(this.archive.meta.id);
    if (item) {
      this.dialog.open(SubmissionViewComponent, {
        data: item._updateSubmission(_copySubmission(item.submission)),
        width: '80%'
      });
    }
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

  private _toggleHighlight(): void {
    if (this.editMode === 'single') {
      this.editableSubmissionService.highlightForm(this.archive.meta.id);
    }
  }

  public _checkedForBulk(checked: boolean) {
    this.checkedForBulk = checked;
    this.bulkUpdateService.selected(this.archive.meta.id, checked);
  }

}
