import { Component, OnInit, forwardRef, Injector } from '@angular/core';
import { BaseWebsiteSubmissionForm } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { TagConfig } from 'src/app/utils/components/tag-input/tag-input.component';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'furry-network-journal-form',
  templateUrl: './furry-network-journal-form.component.html',
  styleUrls: ['./furry-network-journal-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => FurryNetworkJournalForm) }],
  host: {
    'class': 'submission-form'
  }
})
export class FurryNetworkJournalForm extends BaseWebsiteSubmissionForm implements OnInit {

  public optionDefaults: any = {
    profile: [null],
  };

  public tagConfig: TagConfig = {
    minTagLength: 3,
    maxTags: 30
  };

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    if (!this.formGroup.get('tags')) this.formGroup.addControl('tags', new FormControl(null));
    if (!this.formGroup.get('description')) this.formGroup.addControl('description', new FormControl(null));
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }
}
