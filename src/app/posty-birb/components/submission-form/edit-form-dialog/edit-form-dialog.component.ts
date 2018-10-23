import { Component, OnInit, AfterViewInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, OnDestroy, ViewChild, ViewChildren, QueryList, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subscription, BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { MatDialogRef, MatDialog } from '@angular/material';
import { SaveEditDialogComponent } from '../save-edit-dialog/save-edit-dialog.component';
import { CreateTemplateDialogComponent } from '../../dialog/create-template-dialog/create-template-dialog.component';
import { SubmissionRuleHelpDialogComponent } from '../../dialog/submission-rule-help-dialog/submission-rule-help-dialog.component';

import { PostyBirbSubmission } from '../../../../commons/models/posty-birb/posty-birb-submission';
import { WebsiteManagerService } from '../../../../commons/services/website-manager/website-manager.service';
import { SupportedWebsites } from '../../../../commons/enums/supported-websites';
import { WebsiteStatus } from '../../../../commons/enums/website-status.enum';

import { BaseWebsiteFormComponent } from '../base-website-form/base-website-form.component';
import { TemplatesService, Template } from '../../../services/templates/templates.service';

//Not a dialog anymore
@Component({
  selector: 'edit-form-dialog',
  templateUrl: './edit-form-dialog.component.html',
  styleUrls: ['./edit-form-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditFormDialogComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Output() readonly onSave: EventEmitter<any> = new EventEmitter();

  @Input() selectedSubmissions: PostyBirbSubmission[] = [];

  @ViewChild('templateSelect') templateSelect: any;
  @ViewChild('submissionSelect') submissionSelect: any;
  @ViewChildren(BaseWebsiteFormComponent) private websiteForms: QueryList<BaseWebsiteFormComponent>;

  private subscription: Subscription = Subscription.EMPTY;

  public form: FormGroup;
  public defaultDescription: BehaviorSubject<any>;
  public defaultTags: any;
  public supportedWebsites: any = SupportedWebsites;
  public onlineWebsites: string[] = [];
  public offlineWebsites: string[] = [];
  public template: PostyBirbSubmission;

  constructor(private managerService: WebsiteManagerService, private fb: FormBuilder, private dialog: MatDialog, private templates: TemplatesService, private _changeDetector: ChangeDetectorRef) {
    this.defaultDescription = new BehaviorSubject(undefined);
    this.form = this.fb.group({
      defaultDescription: [],
      defaultTags: [],
      selectedWebsites: [[], [Validators.required, Validators.minLength(1)]]
    });
  }

  ngOnInit() {
    this.form.controls.defaultDescription.valueChanges.subscribe(value => this.defaultDescription.next(value));
    this.form.controls.defaultTags.valueChanges.subscribe(value => this.defaultTags = value);
    this.form.controls.selectedWebsites.valueChanges.subscribe((value) => {
      this.formsAreValid();

      if (value && value instanceof Array) {
        this.form.controls.selectedWebsites.patchValue(value.filter(website => this.onlineWebsites.includes(website)), { emitEvent: false });
      }

      this._changeDetector.markForCheck();
    });

    this.updateOnlineWebsites(this.managerService.getWebsiteStatuses());
    this.subscription = this.managerService.getObserver().subscribe(statuses => this.updateOnlineWebsites(statuses));
  }

  ngAfterViewInit() {
    // force update so validations can occur
    this.websiteForms.changes.pipe(debounceTime(250)).subscribe(() => {
      this._changeDetector.detectChanges();
      this._changeDetector.markForCheck();
    });

    this.fillFromSingleSubmission();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
      if (changes.selectedSubmissions) {
        this.selectedSubmissions = changes.selectedSubmissions.currentValue || [];
        this.fillFromSingleSubmission();
      }
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.defaultDescription.complete();
  }

  private fillFromSingleSubmission(): void {
    if (this.selectedSubmissions.length === 1) { // only one to edit
      const submission: PostyBirbSubmission = this.selectedSubmissions[0];
      this.form.patchValue(submission.getDefaultFields());
      if (this.websiteForms) this.websiteForms.forEach(form => form.writeValue(submission.getWebsiteFieldFor(form.website)));
    }

    this._changeDetector.markForCheck();
  }

  public websitesSelected(): boolean {
    return (this.form.value.selectedWebsites || []).length > 0;
  }

  public showHelp(): void {
    this.dialog.open(SubmissionRuleHelpDialogComponent);
  }

  public save(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.formsAreValid()) {
        reject(false);
        alert('Edits must be valid to save!');
        return;
      }

      if (this.selectedSubmissions.length === 1) { // Skip dialog when only one to edit
        this.markUntouched();
        const submission: PostyBirbSubmission = this.selectedSubmissions[0];
        submission.setWebsiteFields(this.generateWebsiteValuesObject());
        submission.setDefaultFields(this.form.value);
        submission.setUnpostedWebsites(this.form.value.selectedWebsites);

        this.onSave.emit(true);
        resolve(true);
      } else {
        let dialogRef = this.dialog.open(SaveEditDialogComponent, {
          data: this.selectedSubmissions
        });

        dialogRef.afterClosed().subscribe(selected => {
          if (selected) {
            for (let i = 0; i < selected.length; i++) {
              const submission = selected[i];
              submission.setWebsiteFields(this.generateWebsiteValuesObject());
              submission.setDefaultFields(this.form.value);
              submission.setUnpostedWebsites(this.form.value.selectedWebsites);
            }

            this.markUntouched();
            this.onSave.emit(true);
          }

          resolve(true);
        });
      }
    });
  }

  public saveTemplate(): void {
    let dialogRef: MatDialogRef<CreateTemplateDialogComponent>;
    dialogRef = this.dialog.open(CreateTemplateDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const submission: PostyBirbSubmission = new PostyBirbSubmission(null, null);
        submission.setWebsiteFields(this.generateWebsiteValuesObject());
        submission.setDefaultFields(this.form.value);
        submission.setUnpostedWebsites(this.form.value.selectedWebsites);
        this.templates.addTemplate(result, submission.asSubmissionTemplate());
      }
    });
  }

  public templateSelected(template: Template): void {
    const tmp: PostyBirbSubmission = PostyBirbSubmission.fromArchive(template.template)
    this.form.patchValue(tmp.getDefaultFields());
    if (this.websiteForms) this.websiteForms.forEach(form => form.writeValue(tmp.getWebsiteFieldFor(form.website)));
    this.template = tmp;
    this._changeDetector.markForCheck();
  }

  public loadFromSubmission(event: any): void {
    const submission: PostyBirbSubmission = event.value;
    this.form.patchValue(submission.getDefaultFields());
    this.websiteForms.forEach(form => form.writeValue(submission.getWebsiteFieldFor(form.website)));
    this._changeDetector.markForCheck();
  }

  public clear(): void {
    this.form.reset();
    this.websiteForms.forEach(form => form.clear());
    this.templateSelect.reset();
    this.template = null;
    // HACK: Probably not the best way to clear
    if (this.submissionSelect) this.submissionSelect.writeValue(undefined);
    this._changeDetector.markForCheck();
  }

  private markUntouched(): void {
    this.form.markAsUntouched();
    this.form.markAsPristine();
  }

  private updateOnlineWebsites(statuses: any[]): void {
    let onlineInserted: boolean = false;
    let offlineInserted: boolean = false;

    const keys = Object.keys(statuses);
    for (let i = 0; i < keys.length; i++) {
      const website = keys[i];
      if (statuses[website] === WebsiteStatus.Logged_In) { // Add to Online, remove from Offline
        const index = this.offlineWebsites.indexOf(website);
        if (index !== -1) {
          this.offlineWebsites.splice(index, 1);
        }

        if (!this.onlineWebsites.includes(website)) {
          this.onlineWebsites.push(website);
          onlineInserted = true;
        }
      } else { // Remove from Online, add to Offline
        const index = this.onlineWebsites.indexOf(website);
        if (index !== -1) {
          this.onlineWebsites.splice(index, 1);
        }

        if (!this.offlineWebsites.includes(website)) {
          this.offlineWebsites.push(website);
          offlineInserted = true;
        }
      }

    }

    if (onlineInserted) this.onlineWebsites.sort();
    if (offlineInserted) {
      this.offlineWebsites.sort();
      this.form.controls.selectedWebsites.patchValue(this.form.value.selectedWebsites.filter(website => !this.offlineWebsites.includes(website)));
    }
  }

  public formsAreValid(): boolean {
    if (!this.websiteForms) return;

    const keys = this.form.value.selectedWebsites || [];
    const websiteForms = this.websiteForms.toArray();

    for (let i = 0; i < keys.length; i++) {
      const website = keys[i];

      for (let j = 0; j < websiteForms.length; j++) {
        const form = websiteForms[j];
        if (form.website === website && !form.isValid()) {
          return false
        }
      }
    }

    return keys.length > 0 ? true : false;
  }

  public hasPendingChanges(): boolean {
    if (!this.form.pristine) return true;

    let hasPending: boolean = false;
    this.websiteForms.forEach(form => {
      if (!form.isPristine()) {
        hasPending = true;
      }
    });

    return hasPending;
  }

  public generateWebsiteValuesObject(): any {
    const keys = this.form.value.selectedWebsites || [];

    const vals: any = {};
    this.websiteForms.forEach(form => {
      if (keys.includes(form.website)) {
        vals[form.website] = form.getValues();
      } else {
        vals[form.website] = null;
      }
    });

    return vals;
  }

  public getRequirements(): string[] {
    const requirements = [];

    if (!this.websiteForms) return;

    const keys = this.form.value.selectedWebsites || [];
    const websiteForms = this.websiteForms.toArray();

    for (let i = 0; i < keys.length; i++) {
      const website = keys[i];

      for (let j = 0; j < websiteForms.length; j++) {
        const form = websiteForms[j];
        if (form.website === website && !form.isValid()) {
          requirements.push(form.website);
        }
      }
    }

    return requirements;
  }

}
