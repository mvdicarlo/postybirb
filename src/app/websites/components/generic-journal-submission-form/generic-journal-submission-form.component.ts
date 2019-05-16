import { Component, OnInit, forwardRef, Injector } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from '../base-website-submission-form/base-website-submission-form.component';

@Component({
  selector: 'generic-journal-submission-form',
  templateUrl: './generic-journal-submission-form.component.html',
  styleUrls: ['./generic-journal-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => GenericJournalSubmissionForm) }],
  host: HOST_DATA
})
export class GenericJournalSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
  }

}
