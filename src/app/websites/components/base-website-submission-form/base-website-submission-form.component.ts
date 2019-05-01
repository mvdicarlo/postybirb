import { Component, Input, Injector, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { SubmissionRating } from 'src/app/database/tables/submission.table';
import { TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { ControlContainer, FormGroup, FormBuilder } from '@angular/forms';
import { WebsiteRegistryConfig, WebsiteRegistry } from '../../registries/website.registry';
import { Subscription } from 'rxjs';
import { BaseWebsiteService } from '../../website-services/base-website-service';
import { BaseSubmissionForm } from 'src/app/postybirb/forms/base-submission-form/base-submission-form.component';
import { SnotifyService } from 'ng-snotify';
import { Folder } from '../../interfaces/folder.interface';

@Component({
  selector: 'base-website-submission-form',
  template: '<div></div>'
})
export class BaseWebsiteSubmissionForm implements OnInit, AfterViewInit, OnDestroy {
  @Input() rating: SubmissionRating;
  @Input() type: TypeOfSubmission;
  @Input() website: string;
  @Input() websiteService: BaseWebsiteService;

  public typeOfSubmission = TypeOfSubmission;

  public snotify: SnotifyService;
  public controlContainer: ControlContainer;
  public formBuilder: FormBuilder;
  public parentForm: BaseSubmissionForm;
  public formGroup: FormGroup;
  public config: WebsiteRegistryConfig;
  public optionDefaults: any;
  public resetListener: Subscription = Subscription.EMPTY;

  constructor(private injector: Injector) {
    this.parentForm = injector.get(BaseSubmissionForm);
    this.controlContainer = injector.get(ControlContainer);
    this.formBuilder = injector.get(FormBuilder);
    this.snotify = injector.get(SnotifyService);
  }

  ngOnInit() {
    this.config = WebsiteRegistry.getConfigForRegistry(this.website);
    this.websiteService = this.injector.get(this.config.class);
    this.formGroup = <FormGroup>this.controlContainer.control.get(this.website);
    this.resetListener = this.parentForm.onReset.subscribe(() => {
      // Should I just remove the controls instead?
      this.formGroup.removeControl('tags');
      this.formGroup.removeControl('description');
      if (this.optionDefaults) {
        this.formGroup.removeControl('options');
      }
    });
  }

  ngAfterViewInit() {
    // Behavioral Note: This can have weird behavior if loading in a template if
    // the formData is not set first
    this.formGroup.patchValue(this.parentForm.submission.formData[this.website] || {}, { emitEvent: true });
  }

  ngOnDestroy() {
    this.resetListener.unsubscribe();
  }

  protected resetOnConflict(optionName: string, compareItem: any): void {
    let val: any = this.formGroup.get('options').value[optionName];

    if (val) {
      let failedComparison: boolean = false;
      if (compareItem instanceof Array) {
        if (!(val instanceof Array)) {
          val = [val];
        }
        (val || []).forEach(v => {
          if (!compareItem.includes(v)) {
            failedComparison = true;
          }
        });
      } else {
        failedComparison = val === compareItem;
      }

      if (failedComparison) {
        (<FormGroup>this.formGroup.get('options')).controls[optionName].reset(this.optionDefaults[optionName][0]);
        this.snotify.warning(`${optionName.toUpperCase()} reset due to conflict!`, this.config.websiteConfig.displayedName);
      }
    }
  }

  protected getIdsFromFolders(folders: Folder[]): string[] {
    const ids: string[] = [];

    for (let i = 0; i < folders.length; i++) {
        const f = folders[i];
        ids.push(f.id);
        if (f.subfolders) {
          f.subfolders.forEach(s => {
            ids.push(...this.getIdsFromFolders([s]));
          });
        }
    }

    return ids.filter(id => !!id);
  }

}
