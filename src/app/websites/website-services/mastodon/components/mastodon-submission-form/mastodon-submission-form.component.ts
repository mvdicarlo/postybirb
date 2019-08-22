import { Component, OnInit, Injector, forwardRef } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';

@Component({
  selector: 'mastodon-submission-form',
  templateUrl: './mastodon-submission-form.component.html',
  styleUrls: ['./mastodon-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => MastodonSubmissionForm) }],
  host: HOST_DATA
})
export class MastodonSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {

  public optionDefaults: any = {
    useTitle: [false],
    spoilerText: [],
    sensitiveOverride: [null]
  };

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }

}
