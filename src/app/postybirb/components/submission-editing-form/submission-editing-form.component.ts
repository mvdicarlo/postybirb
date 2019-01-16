import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef, ChangeDetectionStrategy, ElementRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Subscription, BehaviorSubject, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MatDialog } from '@angular/material';

import { Store } from '@ngxs/store';
import { PostyBirbStateAction } from '../../stores/states/posty-birb.state';

import { _trimSubmissionFields, _filelessSubmissionCopy } from '../../helpers/submission-manipulation.helper';

import { ConfirmDialogComponent } from '../../../commons/components/confirm-dialog/confirm-dialog.component';
import { FileInformation } from '../../../commons/models/file-information';
import { OptionsForms } from '../../models/website-options.model';
import { OptionsSectionDirective } from '../../directives/options-section.directive';
import { PostyBirbSubmissionModel, SubmissionArchive } from '../../models/postybirb-submission-model';
import { SubmissionRuleHelpDialogComponent } from '../dialog/submission-rule-help-dialog/submission-rule-help-dialog.component';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { TagFieldComponent } from '../tag-field/tag-field.component';
import { TagRequirements } from '../../models/website-tag-requirements.model';
import { TemplatesService } from '../../services/templates/templates.service';
import { WebsiteCoordinatorService } from '../../../commons/services/website-coordinator/website-coordinator.service';
import { WebsiteStatusManager } from '../../../commons/helpers/website-status-manager';
import { EditableSubmissionsService } from '../../services/editable-submissions/editable-submissions.service';

@Component({
  selector: 'submission-editing-form',
  templateUrl: './submission-editing-form.component.html',
  styleUrls: ['./submission-editing-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.d-none]': 'hidden'
  }
})
export class SubmissionEditingFormComponent implements OnInit, OnDestroy {
  @Input()
  get archive(): SubmissionArchive { return this._archive }
  set archive(value: SubmissionArchive) {
    if (!this._archive) {
      this._archive = value;
      this.canSave();
    } else if (this.archive !== value) {
      this._archive = value;
      this.form.patchValue(value.meta, { emitEvent: false });
      this.canSave();
    }
  }
  private _archive: SubmissionArchive;
  public submission: PostyBirbSubmissionModel;

  @ViewChild('title') title: ElementRef;
  @ViewChild('changeFileInput') changeFileInput: ElementRef;
  @ViewChild('changeThumbnailFileInput') changeThumbnailFileInput: ElementRef;
  @ViewChild('templateSelect') templateSelect: any;
  @ViewChild('copySelect') copySelect: any;
  @ViewChildren(TagFieldComponent) tagFields: QueryList<TagFieldComponent>;
  @ViewChildren(OptionsSectionDirective) optionsFields: QueryList<OptionsSectionDirective>;

  public form: FormGroup;
  public savingEdits: boolean = false;

  public descriptionForm: FormGroup;
  public defaultDescription: BehaviorSubject<any>;

  public tagForm: FormGroup;
  public defaultTags: any;

  public optionsForm: FormGroup;

  public file: any;
  public thumbnail: any;
  public thumbnailIcon: any;
  public fileIcon: string;
  public editing: boolean = false;
  public highlight: boolean = false;

  public onlineWebsites: string[] = [];
  public offlineWebsites: string[] = [];
  private websiteStatusSubscription = Subscription.EMPTY;
  private statusManager: WebsiteStatusManager;

  public issues: any = {};

  public passing: boolean = false;
  private validateSubject: Subject<any>;
  private saveEditsSubject: Subject<any>;

  constructor(fb: FormBuilder, private _store: Store, private _changeDetector: ChangeDetectorRef,
    private websiteCoordinator: WebsiteCoordinatorService, private dialog: MatDialog, private templates: TemplatesService,
    private editableSubmissionService: EditableSubmissionsService) {
    this.defaultDescription = new BehaviorSubject(undefined);

    this.validateSubject = new Subject();
    this.validateSubject.pipe(debounceTime(150)).subscribe(() => {
      this.canSave();
      this._changeDetector.markForCheck();
    }); // try to limit calls to this

    this.saveEditsSubject = new Subject();
    this.saveEditsSubject.pipe(debounceTime(500)).subscribe(() => {
      this._saveEditState();
    }); // try to limit calls to this

    this.form = fb.group({
      title: [null, Validators.maxLength(50)],
      rating: [null, Validators.required],
      schedule: [null],
      websites: [null, Validators.required]
    }, { updateOn: 'blur' });

    this.descriptionForm = fb.group({
      default: [null]
    });

    this.tagForm = fb.group({
      default: [null]
    });

    this.tagForm.controls.default.valueChanges.subscribe(tags => {
      this.defaultTags = tags;
    });

    this.optionsForm = fb.group({});

    Object.keys(SupportedWebsites).forEach(website => {
      if (!TagRequirements[SupportedWebsites[website]].exclude) this.tagForm.addControl(SupportedWebsites[website], new FormControl());
      this.descriptionForm.addControl(SupportedWebsites[website], new FormControl());
      this.optionsForm.addControl(SupportedWebsites[website], new FormControl());
    });

    this.statusManager = new WebsiteStatusManager();

    this.websiteStatusSubscription = websiteCoordinator.asObservable().pipe(debounceTime(250))
      .subscribe((statuses: any) => this._updateWebsiteStatuses(statuses));

    this.form.valueChanges.pipe(debounceTime(250)).subscribe(() => this._validate());
    this.descriptionForm.valueChanges.pipe(debounceTime(250)).subscribe(() => this._validate());
    this.optionsForm.valueChanges.pipe(debounceTime(250)).subscribe(() => this._validate());
    this.tagForm.valueChanges.pipe(debounceTime(250)).subscribe(() => this._validate());
  }

  ngOnInit() {
    this.editableSubmissionService.addEditingForm(this.archive.meta.id, this);
    this.submission = PostyBirbSubmissionModel.fromArchive(this.archive);
    this.file = this.submission.getSubmissionFileObject();
    this._loadFileIconImage();

    this.descriptionForm.controls.default.valueChanges.subscribe(value => this.defaultDescription.next(value));

    this._initialize();
  }

  ngOnDestroy() {
    this.websiteStatusSubscription.unsubscribe();
    this.defaultDescription.complete();
    this.editableSubmissionService.removeEditingForm(this.archive.meta.id);
  }

  public toggleEditing(): void {
    this.editing = !this.editing;
  }

  public async openHelpDialog() {
    this.dialog.open(SubmissionRuleHelpDialogComponent);
  }

  public supportsTags(): boolean {
    return (this.form.value.websites || []).filter(website => {
      return TagRequirements[website].exclude ? false : true;
    }).length > 0;
  }

  public supportsAdditionalOptions(): boolean {
    return (this.form.value.websites || []).filter(website => {
      return OptionsForms[website].exclude ? false : true;
    }).length > 0;
  }

  public supportsAdditionalImages(): boolean {
    const websites = this.form.value.websites || [];

    if (
      websites.includes(SupportedWebsites.Pixiv) ||
      websites.includes(SupportedWebsites.Inkbunny) ||
      websites.includes(SupportedWebsites.Tumblr) ||
      websites.includes(SupportedWebsites.Twitter) ||
      websites.includes(SupportedWebsites.Mastodon) ||
      websites.includes(SupportedWebsites.FurryAmino)
    ) {
      return true;
    }

    return false;
  }

  public getSelectedWebsitesWithOptions(): string[] {
    return this.form.value.websites.filter(website => {
      return OptionsForms[website].exclude ? false : true;
    });
  }

  public getIssueKeys(): string[] {
    return Object.keys(this.issues);
  }

  public getTagWebsites(): string[] {
    return (this.form.value.websites || []).filter(website => !TagRequirements[website].exclude);
  }

  public getInvalidTagFields(): string[] {
    if (this.tagFields && this.tagFields.length) {
      return this.tagFields.toArray().filter(field => !field.validateTagCount()).map(field => field.formControlName);
    }

    return [];
  }

  public tagFieldIsFailing(website: string): boolean {
    if (this.tagFields && this.tagFields.length) {
      const fields = this.tagFields.toArray();
      for (let field in fields) {
        if (fields[field].formControlName == website) {
          return !fields[field].validateTagCount();
        }
      }
    }

    return false;
  }

  public getIncompleteOptionsFields(): string[] {
    if (this.optionsFields && this.optionsFields.length) {
      return this.optionsFields.toArray().filter(field => !field.isComplete()).map(field => field.website);
    }

    return [];
  }

  public additionalImageWebsites(): string[] {
    const selectedWebsites = this.form.value.websites || [];

    const websites = [];
    if (selectedWebsites.includes(SupportedWebsites.Inkbunny)) websites.push(SupportedWebsites.Inkbunny);
    if (selectedWebsites.includes(SupportedWebsites.Mastodon)) websites.push(SupportedWebsites.Mastodon);
    if (selectedWebsites.includes(SupportedWebsites.Pixiv)) websites.push(SupportedWebsites.Pixiv);
    if (selectedWebsites.includes(SupportedWebsites.Tumblr)) websites.push(SupportedWebsites.Tumblr);
    if (selectedWebsites.includes(SupportedWebsites.Twitter)) websites.push(SupportedWebsites.Twitter);

    return websites;
  }

  public async clearForm() {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Clear'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.form.reset({
          rating: null,
          title: null,
          websites: null,
          schedule: null
        });

        this.tagForm.reset();
        this.descriptionForm.reset();
        this.optionsForm.reset();
        this.submission.setAdditionalFiles([]);

        this.issues = {};
        this.templateSelect.reset();
        this.copySelect.reset();
      }

      this._saveEditState();
    });
  }

  public canSave(): boolean {
    this.issues = this.editableSubmissionService.getIssues(this.archive.meta.id);
    this.passing = this.editableSubmissionService.isPassing(this.archive.meta.id);
    this._changeDetector.markForCheck();
    return this.passing;
  }

  public templateSelected(template: SubmissionArchive, useUnpostedWebsites: boolean = false /* Template vs Copy */): void {
    const tmp: PostyBirbSubmissionModel = PostyBirbSubmissionModel.fromArchive(template);
    this.form.controls.websites.patchValue(useUnpostedWebsites ? tmp.unpostedWebsites : (template.websites || tmp.unpostedWebsites));
    this.descriptionForm.patchValue(tmp.descriptionInfo || {});
    this.tagForm.patchValue(tmp.tagInfo || {});
    this.optionsForm.patchValue(tmp.optionInfo || {});
    this._changeDetector.markForCheck();
  }

  public saveTemplate(): void {
    const submission: PostyBirbSubmissionModel = new PostyBirbSubmissionModel(null, null);
    submission.descriptionInfo = this.descriptionForm.value;
    submission.tagInfo = this.tagForm.value;
    submission.optionInfo = this.optionsForm.value;
    submission.unpostedWebsites = this.form.value.websites;
    this.templates.saveTemplate(submission);
  }

  public async save() {
    if (this.canSave()) {
      this.editableSubmissionService.saveForm(this.submission.getId(), false, this._updateSubmission(PostyBirbSubmissionModel.fromArchive(this.submission.asSubmissionArchive())).asSubmissionArchive());
    }
  }

  public async post() {
    if (this.canSave()) {
      this.editableSubmissionService.saveForm(this.submission.getId(), true, this._updateSubmission(PostyBirbSubmissionModel.fromArchive(this.submission.asSubmissionArchive())).asSubmissionArchive());
    }
  }

  public async deleteSubmission() {
    this.editableSubmissionService.deleteForm(this.submission.getId());
  }

  public async openLogin() {
    window['loginPanel'].toggle();
  }

  public changeFile(event: Event): void {
    event.stopPropagation();

    const files: File[] = event.target['files'];

    if (files.length > 0) {
      this.submission.setSubmissionFile(new FileInformation(files[0], false));
      this.file = this.submission.getSubmissionFileObject();

      this._loadFileIconImage();

      this._saveEditState();
    }

    this.changeFileInput.nativeElement.value = '';
  }

  public changeThumbnail(event: Event): void {
    event.stopPropagation();

    const files: File[] = event.target['files'];

    if (files.length > 0 && files[0].size <= 2000000 && files[0].type.includes('image')) { // no thumbnails over 2MB
      this.submission.setThumbnailFile(new FileInformation(files[0], false));

      this.thumbnail = this.submission.getThumbnailFileObject();
      this.submission.getThumbnailFileSource().then(src => {
        this.thumbnailIcon = src;
        this._changeDetector.markForCheck();
      });

      this._saveState();
    }

    this.changeThumbnailFileInput.nativeElement.value = '';
  }

  public async removeThumbnail() {
    this.submission.setThumbnailFile(null);
    this.thumbnail = null;
    this.thumbnailIcon = null;

    this._saveState();
  }

  private async _initialize() {
    if (this.submission.getThumbnailFileObject()) {
      this.thumbnail = this.submission.getThumbnailFileObject();
      this.thumbnailIcon = await this.submission.getThumbnailFileIcon({
        height: 100,
        width: 100
      });
    }

    this.form.patchValue({
      title: this.submission.title,
      rating: this.submission.rating || null,
      schedule: this.submission.schedule || null,
      websites: this.submission.unpostedWebsites || []
    });

    this.descriptionForm.patchValue(this.submission.descriptionInfo || {});
    this.tagForm.patchValue(this.submission.tagInfo || {});
    this.optionsForm.patchValue(this.submission.optionInfo || {});

    this._changeDetector.markForCheck();

    this._initiateSaveTracker();
  }

  private _initiateSaveTracker(): void {
    setTimeout(function() {
      try {
        this.tagForm.valueChanges.pipe(debounceTime(250))
        .subscribe(() => {
          this._saveState();
        });

        this.descriptionForm.valueChanges.pipe(debounceTime(250))
        .subscribe(() => {
          this._saveState();
        });

        this.form.valueChanges.pipe(debounceTime(250))
        .subscribe(() => {
          this._saveState();
        });

        this.optionsForm.valueChanges.pipe(debounceTime(250))
        .subscribe(() => {
          this._saveState();
        });
      } catch (e) { /* swallow it */}
    }.bind(this), 2000);
  }

  private _updateWebsiteStatuses(statuses: any): void {
    this.statusManager.update(statuses);
    const offline = this.statusManager.getOffline();
    const selected = (this.form.value.websites || []).filter(website => !offline.includes(website));
    this.form.controls.websites.patchValue(selected);

    this.offlineWebsites = this.statusManager.getOffline();
    this.onlineWebsites = this.statusManager.getOnline();

    this._changeDetector.markForCheck();
  }

  public _updateSubmission(submission: PostyBirbSubmissionModel): PostyBirbSubmissionModel {
    const values = this.form.value;
    submission.title = values.title;
    submission.rating = values.rating;
    submission.descriptionInfo = this.descriptionForm.value;
    submission.tagInfo = this.tagForm.value;
    submission.optionInfo = this.optionsForm.value;
    submission.unpostedWebsites = values.websites;
    submission.schedule = values.schedule;

    return submission;
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

  public async saveAndValidate() {
    this.validateSubject.next();
    this.saveEditsSubject.next();
  }

  public async _validate() {
    this.validateSubject.next();
  }

  public async _saveState() {
    this.saveEditsSubject.next();
  }

  private _saveEditState(): void {
    this.savingEdits = true;

    this._store
    .dispatch(new PostyBirbStateAction.UpdateSubmission(this._updateSubmission(PostyBirbSubmissionModel.fromArchive(this.submission.asSubmissionArchive())).asSubmissionArchive()))
    .subscribe(() => {
      this.savingEdits = false;
      this._changeDetector.markForCheck();
    }
  );
    this._changeDetector.markForCheck();
  }

  public toggleHighlight() {
    this.highlight = !this.highlight;
    this._changeDetector.markForCheck();
  }

}
