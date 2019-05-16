import { Component, OnInit, Injector, forwardRef } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { FurryAmino } from '../../furry-amino.service';

@Component({
  selector: 'furry-amino-submission-form',
  templateUrl: './furry-amino-submission-form.component.html',
  styleUrls: ['./furry-amino-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => FurryAminoSubmissionForm) }],
  host: HOST_DATA
})
export class FurryAminoSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {
  public categories: any[] = [];
  public optionDefaults: any = {
    categories: [[]]
  };

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.categories = (<FurryAmino>this.websiteService).categories;
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }
}
