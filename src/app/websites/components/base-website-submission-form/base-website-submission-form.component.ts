import { Component, Input, Injector, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { SubmissionRating } from 'src/app/database/tables/submission.table';
import { TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { ControlContainer, FormGroup, FormBuilder } from '@angular/forms';
import { WebsiteRegistryConfig, WebsiteRegistry } from '../../registries/website.registry';
import { BaseWebsiteService } from '../../website-services/base-website-service';
import { BaseSubmissionForm } from 'src/app/postybirb/forms/base-submission-form/base-submission-form.component';
import { SnotifyService } from 'ng-snotify';
import { Folder } from '../../interfaces/folder.interface';
import { copyObject } from 'src/app/utils/helpers/copy.helper';
import * as dotProp from 'dot-prop';

export const HOST_DATA = {
  'class': 'submission-form'
};

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
  public initialized: boolean = false;

  public snotify: SnotifyService;
  public controlContainer: ControlContainer;
  public formBuilder: FormBuilder;
  public parentForm: BaseSubmissionForm;
  public formGroup: FormGroup;
  public config: WebsiteRegistryConfig;
  public optionDefaults: any;

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

    this.initialized = true;
  }

  ngAfterViewInit() {
    this.formGroup.patchValue(this.restoreOptions(this.parentForm.submission.formData[this.website] || {}));
  }

  ngOnDestroy() { }

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

  protected getOptionDefaults(): any | null {
    if (this.optionDefaults) {
      const defaults: any = copyObject(this.optionDefaults);
      const defaultVals: any = {};
      Object.entries(defaults).forEach(([key, value]) => {
        defaultVals[key] = Array.isArray(value) ? value[0] : value;
      });
      return defaultVals;
    }

    return null;
  }

  protected restoreOptions(data: any): any {
    if (!this.optionDefaults) return copyObject(data);

    const restoredObj: any = copyObject(data);
    const options = dotProp.get(restoredObj, 'options', {});
    Object.entries(this.getOptionDefaults())
      .forEach(([key, value]) => {
        if (options[key] === undefined || options[key] === null) {
          options[key] = value;
        }
      });
    restoredObj.options = options;
    return restoredObj;
  }

}
