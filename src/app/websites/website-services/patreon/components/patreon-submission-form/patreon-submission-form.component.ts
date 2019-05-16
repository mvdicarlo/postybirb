import { Component, OnInit, forwardRef, Injector } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { TagConfig } from 'src/app/utils/components/tag-input/tag-input.component';
import { Validators } from '@angular/forms';

@Component({
  selector: 'patreon-submission-form',
  templateUrl: './patreon-submission-form.component.html',
  styleUrls: ['./patreon-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => PatreonSubmissionForm) }],
  host: HOST_DATA
})
export class PatreonSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {

  public optionDefaults: any = {
    minimumDollarsToView: [0, Validators.min(0)],
    chargePatrons: [false],
    patronsOnly: [false],
    schedule: [null]
  };

  public tagConfig: TagConfig = {
    maxTags: 5
  };

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }

}
