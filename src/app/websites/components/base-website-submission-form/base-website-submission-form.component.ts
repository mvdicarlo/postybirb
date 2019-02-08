import { Component, Input, Injector, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { SubmissionRating } from 'src/app/database/tables/submission.table';
import { TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { ControlContainer, FormGroup, FormBuilder } from '@angular/forms';
import { SubmissionForm } from 'src/app/postybirb/forms/submission-form/submission-form.component';
import { WebsiteRegistryConfig, WebsiteRegistry } from '../../registries/website.registry';
import { Subscription } from 'rxjs';

@Component({
  selector: 'base-website-submission-form',
  template: '<div></div>',
  styleUrls: ['./base-website-submission-form.component.css']
})
export class BaseWebsiteSubmissionForm implements OnInit, AfterViewInit, OnDestroy {
  @Input() rating: SubmissionRating;
  @Input() type: TypeOfSubmission;
  @Input() website: string;

  public typeOfSubmission = TypeOfSubmission;

  public controlContainer: ControlContainer;
  public formBuilder: FormBuilder;
  public parentForm: SubmissionForm;
  public formGroup: FormGroup;
  public config: WebsiteRegistryConfig;
  public optionDefaults: any;
  public resetListener: Subscription = Subscription.EMPTY;

  constructor(injector: Injector) {
    this.parentForm = injector.get(SubmissionForm);
    this.controlContainer = injector.get(ControlContainer);
    this.formBuilder = injector.get(FormBuilder);
  }

  ngOnInit() {
    this.config = WebsiteRegistry.getConfigForRegistry(this.website);
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
