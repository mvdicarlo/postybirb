import { Component, Input, Injector, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { SubmissionRating } from 'src/app/database/tables/submission.table';
import { TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { ControlContainer, FormGroup, FormBuilder } from '@angular/forms';
import { WebsiteRegistryConfig, WebsiteRegistry } from '../../registries/website.registry';
import { Subscription } from 'rxjs';
import { BaseWebsiteService } from '../../website-services/base-website-service';
import { BaseSubmissionForm } from 'src/app/postybirb/forms/base-submission-form/base-submission-form.component';

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
  }

  ngOnInit() {
    this.config = WebsiteRegistry.getConfigForRegistry(this.website);
    this.websiteService = this.injector.get(this.config.class);
    this.formGroup = <FormGroup>this.controlContainer.control.get(this.website);
    this.resetListener = this.parentForm.onReset.subscribe(() => {
      if (this.optionDefaults) {
        this.formGroup.controls.options.reset(this.optionDefaults);
      }
    });
  }

  ngAfterViewInit() {
    this.formGroup.patchValue(this.parentForm.submission.formData[this.website] || {}, { emitEvent: false });
  }

  ngOnDestroy() {
    this.resetListener.unsubscribe();
  }

}
