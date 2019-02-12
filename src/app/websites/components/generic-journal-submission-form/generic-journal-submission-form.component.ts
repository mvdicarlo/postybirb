import { Component, OnInit, forwardRef, Injector } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BaseWebsiteSubmissionForm } from '../base-website-submission-form/base-website-submission-form.component';

@Component({
  selector: 'generic-journal-submission-form',
  templateUrl: './generic-journal-submission-form.component.html',
  styleUrls: ['./generic-journal-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => GenericJournalSubmissionForm) }],
  host: {
    'class': 'submission-form'
  }
})
export class GenericJournalSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    if (!this.formGroup.get('tags')) this.formGroup.addControl('tags', new FormControl(null));
    if (!this.formGroup.get('description')) this.formGroup.addControl('description', new FormControl(null));
  }

}
