import { Component, OnInit, forwardRef, Injector } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';

@Component({
  selector: 'fur-affinity-journal-form',
  templateUrl: './fur-affinity-journal-form.component.html',
  styleUrls: ['./fur-affinity-journal-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => FurAffinityJournalForm) }],
  host: HOST_DATA
})
export class FurAffinityJournalForm extends BaseWebsiteSubmissionForm implements OnInit {

  public optionDefaults: any = {
    feature: [false]
  };

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }

}
