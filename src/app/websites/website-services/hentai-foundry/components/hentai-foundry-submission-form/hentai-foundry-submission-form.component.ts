import { Component, OnInit, forwardRef, Injector } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { TagConfig } from 'src/app/utils/components/tag-input/tag-input.component';
import { Validators } from '@angular/forms';

@Component({
  selector: 'hentai-foundry-submission-form',
  templateUrl: './hentai-foundry-submission-form.component.html',
  styleUrls: ['./hentai-foundry-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => HentaiFoundrySubmissionForm) }],
  host: HOST_DATA
})
export class HentaiFoundrySubmissionForm  extends BaseWebsiteSubmissionForm implements OnInit {

  public optionDefaults: any = {
      scraps: [false],
      disableComments: [false],
      category: [null, Validators.required],
      nudityRating: ['0', Validators.required],
      violenceRating: ['0', Validators.required],
      profanityRating: ['0', Validators.required],
      racismRating: ['0', Validators.required],
      sexRating: ['0', Validators.required],
      spoilersRating: ['0', Validators.required],
      yaoi: [false],
      yuri: [false],
      teen: [false],
      guro: [false],
      furry: [false],
      beast: [false],
      male: [false],
      female: [false],
      futa: [false],
      other: [false],
      scat: [false],
      incest: [false],
      rape: [false],
      media: ['0', Validators.required],
      timeTaken: [null],
      license: ['0'],
      reference: [null]
    };

  public tagConfig: TagConfig = {
    maxStringLength: 75
  };

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }

}
