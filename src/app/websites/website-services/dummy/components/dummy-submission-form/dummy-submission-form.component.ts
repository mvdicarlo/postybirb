import { Component, OnInit, Injector, forwardRef } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';

@Component({
  selector: 'dummy-submission-form',
  templateUrl: './dummy-submission-form.component.html',
  styleUrls: ['./dummy-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => DummySubmissionForm) }],
  host: HOST_DATA
})
export class DummySubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
  }


}
