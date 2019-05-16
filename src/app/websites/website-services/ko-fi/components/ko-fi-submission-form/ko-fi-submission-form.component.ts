import { Component, OnInit, Injector, forwardRef } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';

@Component({
  selector: 'ko-fi-submission-form',
  templateUrl: './ko-fi-submission-form.component.html',
  styleUrls: ['./ko-fi-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => KoFiSubmissionForm) }],
  host: HOST_DATA
})
export class KoFiSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {

  public optionDefaults: any = {
    audience: ['public']
  };

  public isGold: boolean = false;

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.isGold = (<any>this.websiteService).isGold(this.parentForm.getLoginProfileId());
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }

}
