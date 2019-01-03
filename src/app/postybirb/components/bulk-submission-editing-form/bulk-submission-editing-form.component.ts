import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild, ViewChildren, QueryList, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Subscription, BehaviorSubject, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MatDialog } from '@angular/material';

import { checkForCompletion } from '../../helpers/completion-checker.helper';
import { _trimSubmissionFields, _filelessSubmissionCopy } from '../../helpers/submission-manipulation.helper';

import { ConfirmDialogComponent } from '../../../commons/components/confirm-dialog/confirm-dialog.component';
import { OptionsForms } from '../../models/website-options.model';
import { OptionsSectionDirective } from '../../directives/options-section.directive';
import { PostyBirbSubmissionModel, SubmissionArchive } from '../../models/postybirb-submission-model';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { TagFieldComponent } from '../tag-field/tag-field.component';
import { TagRequirements } from '../../models/website-tag-requirements.model';
import { TemplatesService } from '../../services/templates/templates.service';
import { WebsiteCoordinatorService } from '../../../commons/services/website-coordinator/website-coordinator.service';
import { WebsiteStatusManager } from '../../../commons/helpers/website-status-manager';
import { BulkUpdateService } from '../../services/bulk-update/bulk-update.service';

@Component({
  selector: 'bulk-submission-editing-form',
  templateUrl: './bulk-submission-editing-form.component.html',
  styleUrls: ['./bulk-submission-editing-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkSubmissionEditingFormComponent implements OnInit, OnDestroy {
  @Output() readonly bulkSaved: EventEmitter<any> = new EventEmitter();

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
  public thumbnailIcon: any;
  public fileIcon: string;

  public onlineWebsites: string[] = [];
  public offlineWebsites: string[] = [];
  private websiteStatusSubscription = Subscription.EMPTY;
  private statusManager: WebsiteStatusManager;

  public passing: boolean = false;
  private validateSubject: Subject<any>;

  constructor(fb: FormBuilder, private _changeDetector: ChangeDetectorRef, private bulkUpdateService: BulkUpdateService,
    private websiteCoordinator: WebsiteCoordinatorService, private dialog: MatDialog, private templates: TemplatesService) {
    this.defaultDescription = new BehaviorSubject(undefined);

    this.validateSubject = new Subject();
    this.validateSubject.pipe(debounceTime(150)).subscribe(() => {
      this.canSave();
      this._changeDetector.markForCheck();
    }); // try to limit calls to this

    this.form = fb.group({
      title: [null, Validators.maxLength(50)],
      rating: ['General', Validators.required],
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

    this.websiteStatusSubscription = websiteCoordinator.asObservable().pipe(debounceTime(250))
      .subscribe((statuses: any) => this._updateWebsiteStatuses(statuses));

    this.form.valueChanges.pipe(debounceTime(200)).subscribe(() => this._validate());
    this.descriptionForm.valueChanges.pipe(debounceTime(200)).subscribe(() => this._validate());
    this.optionsForm.valueChanges.pipe(debounceTime(200)).subscribe(() => this._validate());
    this.tagForm.valueChanges.pipe(debounceTime(200)).subscribe(() => this._validate());
  }

  ngOnInit() {
    this.descriptionForm.controls.default.valueChanges.subscribe(value => this.defaultDescription.next(value));
    const stored = store.get('bulkUpdate');
    if (stored) {
      this.templateSelected(stored, true);
    }
  }

  ngOnDestroy() {
    store.set('bulkUpdate', this._updateSubmission(new PostyBirbSubmissionModel(null)).asSubmissionTemplate());
    this.websiteStatusSubscription.unsubscribe();
    this.defaultDescription.complete();
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

  public async clearForm() {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Clear'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        store.remove('bulkUpdate');

        this.form.reset({
          rating: 'General',
          title: null,
          websites: null,
          schedule: null
        });

        this.tagForm.reset();
        this.descriptionForm.reset();
        this.optionsForm.reset();

        this.templateSelect.reset();
        this.copySelect.reset();
      }
    });
  }

  public canSave(): boolean {
    if (this.form.valid) {
      if (!checkForCompletion(_filelessSubmissionCopy(this.form.value, this.descriptionForm.value, this.tagForm.value, this.optionsForm.value))) {
        this.passing = false;
        return false;
      }

      if (this.getInvalidTagFields().length) {
        this.passing = false;
        return false; // has invalid tag fields
      }

      if (this.getIncompleteOptionsFields().length) {
        this.passing = false;
        return false;
      }

      this.passing = true;
      return true;
    }

    this.passing = false;
    return false;
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
    if (this.passing) {
      const submission = this._updateSubmission(new PostyBirbSubmissionModel(null));
      this.bulkUpdateService.bulkUpdate(submission.asSubmissionTemplate())
      .then(() => {
        this.bulkSaved.emit();
      }).catch(() => {
        // Do nothing
      });
    }
  }

  public async openLogin() {
    window['loginPanel'].toggle();
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

  public async _validate() {
    this.validateSubject.next();
  }

}
