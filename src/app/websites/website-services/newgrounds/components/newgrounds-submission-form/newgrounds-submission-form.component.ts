import { Component, OnInit, forwardRef, Injector } from '@angular/core';
import { BaseWebsiteSubmissionForm } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { FormControl, Validators } from '@angular/forms';
import { TagConfig } from 'src/app/utils/components/tag-input/tag-input.component';

@Component({
  selector: 'newgrounds-submission-form',
  templateUrl: './newgrounds-submission-form.component.html',
  styleUrls: ['./newgrounds-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => NewgroundsSubmissionForm) }],
  host: {
    'class': 'submission-form'
  }
})
export class NewgroundsSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {

  public tagConfig: TagConfig = {
    maxTags: 12
  };

  public optionDefaults: any = {
    creativeCommons: [true],
    commercial: [false],
    modification: [true],
    sketch: [false],
    category: [1],
    nudity: [null, Validators.required],
    violence: [null, Validators.required],
    text: [null, Validators.required],
    adult: [null, Validators.required]
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
