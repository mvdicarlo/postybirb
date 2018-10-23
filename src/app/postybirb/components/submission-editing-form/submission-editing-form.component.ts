import { Component, OnInit, OnDestroy, Input, EventEmitter, Output, ChangeDetectorRef, ChangeDetectionStrategy, ElementRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Subscription, BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MatDialog, MatDialogRef, MatBottomSheet } from '@angular/material';

import { Store } from '@ngxs/store';
import { PostyBirbStateAction } from '../../stores/states/posty-birb.state';

import { checkForWebsiteAndFileIncompatibility } from '../../helpers/incompatibility-checker.helper';
import { ConfirmDialogComponent } from '../../../commons/components/confirm-dialog/confirm-dialog.component';
import { CreateTemplateDialogComponent } from '../dialog/create-template-dialog/create-template-dialog.component';
import { FileInformation } from '../../../commons/models/file-information';
import { OptionsForms } from '../../models/website-options.model';
import { OptionsSectionDirective } from '../../directives/options-section.directive';
import { PostyBirbSubmissionModel, SubmissionArchive } from '../../models/postybirb-submission-model';
import { SubmissionRuleHelpDialogComponent } from '../dialog/submission-rule-help-dialog/submission-rule-help-dialog.component';
import { SubmissionSheetComponent } from '../sheets/submission-sheet/submission-sheet.component';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { TagFieldComponent } from '../tag-field/tag-field.component';
import { TagRequirements } from '../../models/website-tag-requirements.model';
import { TemplatesService } from '../../services/templates/templates.service';
import { WebsiteManagerService } from '../../../commons/services/website-manager/website-manager.service';
import { WebsiteStatusManager } from '../../../commons/helpers/website-status-manager';

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
  @Output() readonly hiddenChange: EventEmitter<any> = new EventEmitter();
  @Input() archive: SubmissionArchive;
  public submission: PostyBirbSubmissionModel;

  get hidden() { return this._hidden }
  set hidden(search: any) {
    if (!search) {
      if (this.hidden) {
        this._hidden = false;
        this._changeDetector.markForCheck();
      }
    } else if (this._includesSearch(search)) {
      this._hidden = false;
      this._changeDetector.markForCheck();
    } else {
      this._hidden = true;
      this._changeDetector.markForCheck();
    }

    this.hiddenChange.emit();
  }
  private _hidden: boolean = false;

  @ViewChild('title') title: ElementRef;
  @ViewChild('changeFileInput') changeFileInput: ElementRef;
  @ViewChild('changeThumbnailFileInput') changeThumbnailFileInput: ElementRef;
  @ViewChild('templateSelect') templateSelect: any;
  @ViewChild('copySelect') copySelect: any;
  @ViewChildren(TagFieldComponent) tagFields: QueryList<TagFieldComponent>;
  @ViewChildren(OptionsSectionDirective) optionsFields: QueryList<OptionsSectionDirective>;

  public form: FormGroup;

  public descriptionForm: FormGroup;
  public defaultDescription: BehaviorSubject<any>;

  public tagForm: FormGroup;
  public defaultTags: any;

  public optionsForm: FormGroup;

  public file: any;
  public thumbnail: any;
  public src: any;
  public thumbnailSrc: any;
  public fileIcon: string;
  public editing: boolean = false;

  public onlineWebsites: string[] = [];
  public offlineWebsites: string[] = [];
  private websiteStatusSubscription = Subscription.EMPTY;
  private statusManager: WebsiteStatusManager;

  public issues: any = {};

  constructor(fb: FormBuilder, private _store: Store, private bottomSheet: MatBottomSheet, private _changeDetector: ChangeDetectorRef, private websiteManager: WebsiteManagerService, private dialog: MatDialog, private templates: TemplatesService) {
    this.defaultDescription = new BehaviorSubject(undefined);

    this.form = fb.group({
      title: ['', Validators.maxLength(50)],
      rating: [null, Validators.required],
      schedule: [null],
      websites: [null, Validators.required]
    });

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

    this.websiteStatusSubscription = websiteManager.getObserver().pipe(debounceTime(250))
      .subscribe((statuses: any) => this._updateWebsiteStatuses(statuses));

    this.form.controls.websites.valueChanges.pipe(debounceTime(200)).subscribe((websites: string[]) => {
      this.issues = checkForWebsiteAndFileIncompatibility(this.file, this.form.value.rating, this.submission.type, websites);
      this._changeDetector.markForCheck();
    });
  }

  ngOnInit() {
    this.submission = PostyBirbSubmissionModel.fromArchive(this.archive);
    this.file = this.submission.getSubmissionFileObject();
    this._loadFileIconImage();

    this.descriptionForm.controls.default.valueChanges.subscribe(value => this.defaultDescription.next(value));

    this._initialize();
  }

  ngOnDestroy() {
    this.websiteStatusSubscription.unsubscribe();
    this.defaultDescription.complete();
  }

  public toggleEditing(): void {
    this.editing = !this.editing;

    if (!this.editing && this._modelHasChanged()) {
      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: { title: 'Save Edits' }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this._updateSubmission();
          this._store.dispatch(new PostyBirbStateAction.UpdateSubmission(this.submission.asSubmissionArchive()));
        }
      });
    }
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
      websites.includes(SupportedWebsites.Mastodon)
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
    this.form.reset({
      rating: null,
      title: 'New Submission',
      websites: null,
      schedule: null
    });

    this.tagForm.reset();
    this.descriptionForm.reset();
    this.optionsForm.reset();

    this.issues = {};
    this.templateSelect.reset();
    this.copySelect.reset();
  }

  public canSave(): boolean {
    if (this.form.valid) {
      if (this.getInvalidTagFields().length) {
        return false; // has invalid tag fields
      }

      if (this.getIncompleteOptionsFields().length) {
        return false;
      }

      return true;
    }

    return false;
  }

  public templateSelected(template: SubmissionArchive): void {
    const tmp: PostyBirbSubmissionModel = PostyBirbSubmissionModel.fromArchive(template);
    this.form.controls.websites.patchValue(tmp.unpostedWebsites);
    this.descriptionForm.patchValue(tmp.descriptionInfo || {});
    this.tagForm.patchValue(tmp.tagInfo || {});
    this.optionsForm.patchValue(tmp.optionInfo || {});
    this._changeDetector.markForCheck();
  }

  public saveTemplate(): void {
    let dialogRef: MatDialogRef<CreateTemplateDialogComponent>;
    dialogRef = this.dialog.open(CreateTemplateDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const submission: PostyBirbSubmissionModel = new PostyBirbSubmissionModel(null, null);
        submission.descriptionInfo = this.descriptionForm.value;
        submission.tagInfo = this.tagForm.value;
        submission.optionInfo = this.optionsForm.value;
        submission.unpostedWebsites = this.form.value.websites;
        this.templates.addTemplate(result, submission.asSubmissionTemplate());
      }
    });
  }

  public async save() {
    if (this.canSave()) {
      this._updateSubmission();
      this._store.dispatch(new PostyBirbStateAction.AddSubmission(this._trimSubmissionFields(this.submission).asSubmissionArchive(), true));

      this.bottomSheet.open(SubmissionSheetComponent, {
        data: { index: 0 }
      });
    }
  }

  public async post() {
    if (this.canSave()) {
      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: { title: 'Post' }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this._updateSubmission();
          const archive = this._trimSubmissionFields(this.submission).asSubmissionArchive()
          this._store.dispatch([new PostyBirbStateAction.AddSubmission(archive, true), new PostyBirbStateAction.QueueSubmission(archive)]);

          this.bottomSheet.open(SubmissionSheetComponent, {
            data: { index: 0 }
          });
        }
      });
    }
  }

  public async deleteSubmission() {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this._store.dispatch(new PostyBirbStateAction.DeleteSubmission(this.archive));
      }
    });
  }

  public async openLogin() {
    window['loginPanel'].toggle();
  }

  public changeFile(event: Event): void {
    event.stopPropagation();

    const files: File[] = event.target['files'];

    if (files.length > 0) {
      this.submission.setSubmissionFile(new FileInformation(files[0], true));
      this.file = this.submission.getSubmissionFileObject();

      this._loadFileIconImage();

      this.issues = checkForWebsiteAndFileIncompatibility(this.file, this.form.value.rating, this.submission.type, this.form.value.websites);
      this._changeDetector.markForCheck();
    }

    this.changeFileInput.nativeElement.value = '';
  }

  public changeThumbnail(event: Event): void {
    event.stopPropagation();

    const files: File[] = event.target['files'];

    if (files.length > 0 && files[0].size <= 2000000) { // no thumbnails over 2MB
      this.submission.setThumbnailFile(new FileInformation(files[0], true));

      this.submission.getThumbnailFileSource().then(src => {
        this.thumbnailSrc = src;
        this._changeDetector.markForCheck();
      });

      this.thumbnail = this.submission.getThumbnailFileObject();

      this._changeDetector.markForCheck();
    }

    this.changeThumbnailFileInput.nativeElement.value = '';
  }

  public async removeThumbnail() {
    this.submission.setThumbnailFile(null);
    this.thumbnail = null;
    this.thumbnailSrc = null;
    this._changeDetector.markForCheck();
  }

  private async _initialize() {
    if (this.submission.getThumbnailFileObject()) {
      this.thumbnail = this.submission.getThumbnailFileObject();
      this.thumbnailSrc = await this.submission.getThumbnailFileSource();
    }

    this.form.patchValue({
      title: this.submission.title || 'New Submission',
      rating: this.submission.rating || null,
      schedule: this.submission.schedule || null,
      websites: this.submission.unpostedWebsites || []
    });

    this.descriptionForm.patchValue(this.submission.descriptionInfo || {});
    this.tagForm.patchValue(this.submission.tagInfo || {});
    this.optionsForm.patchValue(this.submission.optionInfo || {});

    this._changeDetector.markForCheck();
  }

  private _includesSearch(search: string): boolean {
    if (this.file && this.file.name.toLowerCase().includes(search)) return true;
    if (this.form.value.title.toLowerCase().includes(search)) return true;
    return false;
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

  private _modelHasChanged(): boolean {
    let current: SubmissionArchive = this.submission.asSubmissionArchive();
    const withUpdates: PostyBirbSubmissionModel = PostyBirbSubmissionModel.fromArchive(current);
    current = this._trimSubmissionFields(PostyBirbSubmissionModel.fromArchive(current)).asSubmissionArchive();

    const values = this.form.value;
    withUpdates.title = values.title;
    withUpdates.rating = values.rating;
    withUpdates.descriptionInfo = this.descriptionForm.value;
    withUpdates.tagInfo = this.tagForm.value;
    withUpdates.optionInfo = this.optionsForm.value;
    withUpdates.unpostedWebsites = values.websites;
    withUpdates.schedule = values.schedule;

    return JSON.stringify(current, (key, value) => {
      if (value !== null) return value
    }) != JSON.stringify(this._trimSubmissionFields(withUpdates).asSubmissionArchive(), (key, value) => {
      if (value !== null) return value
    });
  }

  private _updateSubmission(): PostyBirbSubmissionModel {
    const values = this.form.value;
    this.submission.title = values.title;
    this.submission.rating = values.rating;
    this.submission.descriptionInfo = this.descriptionForm.value;
    this.submission.tagInfo = this.tagForm.value;
    this.submission.optionInfo = this.optionsForm.value;
    this.submission.unpostedWebsites = values.websites;
    this.submission.schedule = values.schedule;

    return this.submission;
  }

  // clean out unused things due to removing websites
  private _trimSubmissionFields(model: PostyBirbSubmissionModel): PostyBirbSubmissionModel {
    const websites = model.unpostedWebsites;

    const tagKeys = Object.keys(model.tagInfo || {});
    for (let i = 0; i < tagKeys.length; i++) {
      const key = tagKeys[i];

      if (key == 'default') continue;
      if (!websites.includes(key)) {
        delete model.tagInfo[key];
      }
    }

    const descriptionKeys = Object.keys(model.descriptionInfo || {});
    for (let i = 0; i < descriptionKeys.length; i++) {
      const key = descriptionKeys[i];

      if (key == 'default') continue;
      if (!websites.includes(key)) {
        delete model.descriptionInfo[key];
      }
    }

    const optionKeys = Object.keys(model.optionInfo || {});
    for (let i = 0; i < optionKeys.length; i++) {
      const key = optionKeys[i];

      if (key == 'default') continue;
      if (!websites.includes(key)) {
        delete model.optionInfo[key];
      }
    }

    return model;
  }

  private _loadFileIconImage(): void {
    if (this.file && this.file.type) {
      const fileType: string = this.file.type.split('/')[0]
      if (fileType != 'video' && fileType != 'image') {
        this.src = null;
        getFileIcon(this.file.path, (err, icon) => {
          this.fileIcon = 'data:image/jpeg;base64, ' + icon.toJPEG(100).toString('base64');
          this._changeDetector.detectChanges();
        });
      } else {
        this.fileIcon = null;
        this.submission.getSubmissionFileSource().then(src => {
          this.src = src;
          this._changeDetector.markForCheck();
        });
      }
    }
  }

}
