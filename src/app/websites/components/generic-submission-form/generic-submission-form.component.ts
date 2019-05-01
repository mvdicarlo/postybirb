import { Component, OnInit, forwardRef, Injector } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from '../base-website-submission-form/base-website-submission-form.component';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'generic-submission-form',
  templateUrl: './generic-submission-form.component.html',
  styleUrls: ['./generic-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => GenericSubmissionForm) }],
  host: HOST_DATA
})
export class GenericSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    if (!this.formGroup.get('tags')) this.formGroup.addControl('tags', new FormControl(null));
    if (!this.formGroup.get('description')) this.formGroup.addControl('description', new FormControl(null));
  }

}
