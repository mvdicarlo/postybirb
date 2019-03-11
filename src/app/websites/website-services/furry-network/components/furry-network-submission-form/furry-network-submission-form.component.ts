import { Component, OnInit, Injector, forwardRef } from '@angular/core';
import { BaseWebsiteSubmissionForm } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { TagConfig } from 'src/app/utils/components/tag-input/tag-input.component';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'furry-network-submission-form',
  templateUrl: './furry-network-submission-form.component.html',
  styleUrls: ['./furry-network-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => FurryNetworkSubmissionForm) }],
  host: {
    'class': 'submission-form'
  }
})
export class FurryNetworkSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {

  public optionDefaults: any = {
      notify: [true],
      communityTags: [false],
      status: ['public'],
      profile: [null],
      folders: [null]
    };

  public tagConfig: TagConfig = {
    minTagLength: 3,
    maxTags: 30
  };

  public profiles: any[] = [];
  public collections: any = {};

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.profiles = (<any>this.websiteService).getProfiles(this.parentForm.getLoginProfileId());
    if (!this.formGroup.get('tags')) this.formGroup.addControl('tags', new FormControl(null));
    if (!this.formGroup.get('description')) this.formGroup.addControl('description', new FormControl(null));
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));

    if (this.formGroup.value.options.profile) {
      this.collections = (<any>this.websiteService).getCollections(this.parentForm.getLoginProfileId(), this.formGroup.value.options.profile);
    }

    this.formGroup.get('options').get('profile').valueChanges.subscribe(profile => {
      this.collections = (<any>this.websiteService).getCollections(this.parentForm.getLoginProfileId(), profile);
      this.formGroup.get('options').get('folders').reset();
    });
  }

}
