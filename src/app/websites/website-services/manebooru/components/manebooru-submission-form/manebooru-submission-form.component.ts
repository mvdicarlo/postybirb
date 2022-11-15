import { Component, OnInit, Injector, forwardRef } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { TagConfig } from 'src/app/utils/components/tag-input/tag-input.component';

@Component({
  selector: 'manebooru-submission-form',
  templateUrl: './manebooru-submission-form.component.html',
  styleUrls: ['./manebooru-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => ManebooruSubmissionForm) }],
  host: HOST_DATA
})
export class ManebooruSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {
  public optionDefaults: any = {
    sourceURL: ['']
  };

  public tagConfig: TagConfig = {
    minTags: 3
  };

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }
}
