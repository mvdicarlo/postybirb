import { Component, OnInit, forwardRef, Injector } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'twitter-submission-form',
  templateUrl: './twitter-submission-form.component.html',
  styleUrls: ['./twitter-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => TwitterSubmissionForm) }],
  host: HOST_DATA
})
export class TwitterSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {

    public optionDefaults: any = {
      useTitle: [false],
      sensitiveOverride: [null]
    };

    constructor(injector: Injector) {
      super(injector);
    }

    ngOnInit() {
      super.ngOnInit();
      if (!this.formGroup.get('description')) this.formGroup.addControl('description', new FormControl(null));
      if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
    }

}
