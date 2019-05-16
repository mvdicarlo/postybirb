import { Component, OnInit, Injector, forwardRef } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';

@Component({
  selector: 'inkbunny-submission-form',
  templateUrl: './inkbunny-submission-form.component.html',
  styleUrls: ['./inkbunny-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => InkbunnySubmissionForm) }],
  host: HOST_DATA
})
export class InkbunnySubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {

  public optionDefaults: any = {
      blockGuests: [false],
      friendsOnly: [false],
      notify: [true],
      scraps: [false],
      rating: [null]
    };

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }

}
