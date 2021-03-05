import { Component, OnInit, Injector, forwardRef } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { TagConfig } from 'src/app/utils/components/tag-input/tag-input.component';

@Component({
  selector: 'furbooru-submission-form',
  templateUrl: './furbooru-submission-form.component.html',
  styleUrls: ['./furbooru-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => FurbooruSubmissionForm) }],
  host: HOST_DATA
})
export class FurbooruSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {
  public optionDefaults: any = {
    sourceURL: ['']
  };

  public tagConfig: TagConfig = {
    minTags: 5
  };

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }
}
