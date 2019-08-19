import { Component, OnDestroy, Injector, ChangeDetectorRef, AfterViewInit, ViewChild, isDevMode } from '@angular/core';
import { ProfileStatuses, LoginManagerService } from 'src/app/login/services/login-manager.service';
import { Subscription } from 'rxjs';
import { Submission } from 'src/app/database/models/submission.model';
import { WebsiteRegistryEntry, WebsiteRegistry, WebsiteRegistryConfig } from 'src/app/websites/registries/website.registry';
import { TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { LoginStatus, WebsiteStatus } from 'src/app/websites/interfaces/website-service.interface';
import { MatDialog } from '@angular/material';
import { ISubmission } from 'src/app/database/tables/submission.table';
import { DescriptionInput } from 'src/app/utils/components/description-input/description-input.component';
import { TagInput } from 'src/app/utils/components/tag-input/tag-input.component';
import { LoginProfileSelectDialog } from 'src/app/login/components/login-profile-select-dialog/login-profile-select-dialog.component';
import { debounceTime } from 'rxjs/operators';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { TemplateSelectDialog } from 'src/app/templates/components/template-select-dialog/template-select-dialog.component';
import { InputDialog } from 'src/app/utils/components/input-dialog/input-dialog.component';
import { TemplateManagerService } from 'src/app/templates/services/template-manager.service';
import * as dotProp from 'dot-prop';
import { copyObject } from 'src/app/utils/helpers/copy.helper';
import { QueueInserterService } from '../../services/queue-inserter.service';
import { LoginProfile } from 'src/app/login/interfaces/login-profile';

@Component({
  selector: 'base-submission-form',
  template: '<div></div>',
})
export class BaseSubmissionForm implements AfterViewInit, OnDestroy {
  @ViewChild('defaultTags') defaultTags: TagInput;
  @ViewChild('defaultDescription') defaultDescription: DescriptionInput;

  protected loginStatuses: ProfileStatuses = {};
  protected loginListener: Subscription = Subscription.EMPTY;
  protected profileListener: Subscription = Subscription.EMPTY;
  protected loginProfileListener: Subscription = Subscription.EMPTY;

  public submission: Submission;
  public loading: boolean = false;
  public hideForReload: boolean = false;
  public triggerWebsiteReload: boolean = true;
  public availableWebsites: WebsiteRegistryEntry = {};
  public profiles: LoginProfile[] = [];

  public basicInfoForm: FormGroup;
  public formDataForm: FormGroup;
  public typeOfSubmission: TypeOfSubmission;

  protected _changeDetector: ChangeDetectorRef;
  protected dialog: MatDialog;
  protected _fb: FormBuilder;
  protected _queueInserter: QueueInserterService;
  protected _loginManager: LoginManagerService;
  protected _loginProfileManager: LoginProfileManagerService;
  protected _templateManager: TemplateManagerService;

  constructor(injector: Injector) {
    this._changeDetector = injector.get(ChangeDetectorRef);
    this.dialog = injector.get(MatDialog);
    this._loginManager = injector.get(LoginManagerService);
    this._fb = injector.get(FormBuilder);
    this._loginProfileManager = injector.get(LoginProfileManagerService);
    this._queueInserter = injector.get(QueueInserterService);
    this._templateManager = injector.get(TemplateManagerService);

    // somewhat of a duplicate that could be refactored into other listener if optimization is needed
    this.loginProfileListener = this._loginProfileManager.profileChanges.subscribe(profiles => {
      this.profiles = profiles;
    });

    this.loginListener = this._loginManager.statusChanges.subscribe(statuses => {
      const oldStatuses = this.loginStatuses || {};
      let updatedWebsites: string[] = [];

      if (this.submission.formData.loginProfile && oldStatuses[this.submission.formData.loginProfile]) {
        const profile = this.submission.formData.loginProfile;
        Object.keys(oldStatuses[profile]).forEach(key => {
          if (statuses[profile] && statuses[profile][key]) {
            const status: WebsiteStatus = statuses[profile][key];
            if (status.status !== oldStatuses[profile][key].status || status.username !== oldStatuses[profile][key].username) {
              updatedWebsites.push(key);
            }
          }
        });
      }

      this.loginStatuses = statuses;

      if (updatedWebsites.length) {
        this.triggerWebsiteReload = true;
        this._changeDetector.detectChanges();
        this.triggerWebsiteReload = false;
        this._changeDetector.markForCheck();
      }

      this._changeDetector.markForCheck();
    });
  }

  ngAfterViewInit() {
    // This shouldn't really occur, but it is possible on a rare case
    if (this.formDataForm) {
      this.triggerWebsiteReload = false;
      this.profileListener = this._loginProfileManager.profileChanges.subscribe(profiles => {
        const existingProfiles = profiles.map(p => p.id);
        if (!existingProfiles.includes(this.formDataForm.value.loginProfile)) {
          this.formDataForm.patchValue({ loginProfile: null });
          this._changeDetector.markForCheck();
        }
      });

      if (this.submission.formData && !this.submission.formData.loginProfile && this.formDataForm.value.loginProfile) {
        const obj: any = copyObject(this.submission.formData);
        obj.loginProfile = this.formDataForm.value.loginProfile;
        this.submission.formData = obj;
      }

      this._changeDetector.markForCheck();
    }
  }

  ngOnDestroy() {
    this.loginListener.unsubscribe();
    this.profileListener.unsubscribe();
    this.loginProfileListener.unsubscribe();
  }

  protected _initializeFormDataForm(): void {
    this.formDataForm = this._fb.group({
      loginProfile: [this._loginProfileManager.getDefaultProfile().id, Validators.required],
      defaults: this._fb.group({
        description: [null],
        tags: [null]
      })
    });

    this.formDataForm.addControl('websites', new FormControl([], { updateOn: 'blur', validators: [Validators.required] }));
    this.formDataForm.addControl('excludeThumbnailWebsites', new FormControl([], { updateOn: 'blur', validators: [] }));

    // We want to keep all added websites through the filter so users can remove filtered ones
    if (this.submission.formData && this.submission.formData.websites) {
      this.submission.formData.websites.filter(w => !!w).forEach(website => {
        const config = WebsiteRegistry.getConfigForRegistry(website);
        if (config && this.allowWebsite(config)) this.availableWebsites[website] = config;
      });
    }

    Object.keys(this.availableWebsites).forEach(website => {
      this.formDataForm.addControl(website, this._fb.group({
        tags: [],
        description: []
      }));
    });

    this.formDataForm.patchValue(copyObject(this.submission.formData) || {});

    this.formDataForm.controls.loginProfile.valueChanges
      .subscribe(() => {
        this.triggerWebsiteReload = true;
        this._changeDetector.detectChanges();
        this.triggerWebsiteReload = false;
        this._changeDetector.detectChanges();
        this._changeDetector.markForCheck();
      });

    // Clean up removed websites of dead form controls
    this.formDataForm.controls.websites.valueChanges.subscribe((websites: string[]) => {
      const chosenWebsites = websites || [];
      const resetableWebsites = Object.keys(this.availableWebsites).filter(key => !chosenWebsites.includes(key));
      resetableWebsites.forEach(website => {
        if (this.formDataForm.get(website) && this.formDataForm.get(website).get('options')) {
          (<FormGroup>this.formDataForm.get(website)).removeControl('options');
        }
        if (this.submission && this.submission.formData[website] && this.submission.formData[website].options) {
          delete this.submission.formData[website].options;
        }
      });
    });

    Object.keys(this.formDataForm.controls).forEach(key => {
      let keyField = key;
      this.formDataForm.get(key).valueChanges
        .pipe(debounceTime(200))
        .subscribe((value) => {
          if (JSON.stringify((this.submission.formData || {})[keyField]) !== JSON.stringify(value)) {
            if (isDevMode()) {
              console.info(`UPDATED [${keyField}]`, (this.submission.formData || {})[keyField], value);
            }
            const copy = copyObject(this.submission.formData);
            copy[keyField] = copyObject(value);
            this._formUpdated(copy);
          }
        });
    });
  }

  protected _formUpdated(changes: any): void {
    this.submission.formData = changes;
  }

  protected _copySubmission(submission: ISubmission): void {
    if (submission.formData) this._safeLoadFormData(submission.formData);
    if (submission.rating && this.basicInfoForm) this.basicInfoForm.patchValue({ rating: submission.rating });
    this._changeDetector.markForCheck();
  }

  protected _safeLoadFormData(formData: any): void {
    const copy = copyObject(formData || {});
    this.submission.formData = copy; // need to set this first due to how base-website-submission populate data
    this.formDataForm.patchValue(copy);
  }

  protected allowWebsite(config: WebsiteRegistryConfig): boolean { return !!config };

  public getLoginProfileId(): string {
    return this.formDataForm.value.loginProfile;
  }

  public getWebsites(): string[] {
    let websites = [];
    if (this.formDataForm) {
      websites = (this.formDataForm.value.websites || [])
        .filter(w => !!w)
        .filter(w => !!this.availableWebsites[w]);
    }

    return websites;
  }

  public importTemplateField(paths: string[], event: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.dialog.open(TemplateSelectDialog)
      .afterClosed()
      .subscribe(template => {
        if (template) {
          for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            if (path === 'websites') {
              const websites = dotProp.get(copyObject(template.data), path, [])
                .filter(w => this.allowWebsite(this.availableWebsites[w]));
              dotProp.set(this.submission.formData, path, websites);
            } else {
              dotProp.set(this.submission.formData, path, dotProp.get(copyObject(template.data), path));
            }
          }
          this.formDataForm.patchValue(copyObject(this.submission.formData));
          this._changeDetector.markForCheck();
        }
      });
  }

  public isLoggedIn(website: string): boolean {
    try {
      if (this.loginStatuses && this.formDataForm && this.formDataForm.value.loginProfile) {
        if (this.loginStatuses[this.formDataForm.value.loginProfile][website]) {
          return this.loginStatuses[this.formDataForm.value.loginProfile][website].status === LoginStatus.LOGGED_IN;
        }
      }
    } catch (e) {
      // Catching because electron has a weird issue here
    }

    return false;
  }

  public loadTemplate(): void {
    this.dialog.open(TemplateSelectDialog)
      .afterClosed()
      .subscribe(template => {
        if (template) {
          this._safeLoadFormData(template.data);
        }
      });
  }

  public post(): void {
    if (this.submission.problems.length === 0) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: this.submission.schedule ? 'Schedule' : 'Post'
        }
      }).afterClosed()
        .subscribe(result => {
          if (result) {
            this._queueInserter.queue(this.submission);
          }
        });
    }
  }

  public saveTemplate(): void {
    this.dialog.open(InputDialog, {
      data: {
        title: 'Save',
        minLength: 1,
        maxLength: 50
      }
    }).afterClosed()
      .subscribe(templateName => {
        if (templateName) {
          this._templateManager.createTemplate(templateName.trim(), copyObject(this.formDataForm.value));
        }
      });
  }

  public toggleLogin(): void {
    loginPanel.toggle();
  }

}
