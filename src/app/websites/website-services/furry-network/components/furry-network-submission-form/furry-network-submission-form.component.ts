import { Component, OnInit, Injector, forwardRef, AfterViewInit } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { TagConfig } from 'src/app/utils/components/tag-input/tag-input.component';

@Component({
  selector: 'furry-network-submission-form',
  templateUrl: './furry-network-submission-form.component.html',
  styleUrls: ['./furry-network-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => FurryNetworkSubmissionForm) }],
  host: HOST_DATA
})
export class FurryNetworkSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit, AfterViewInit {

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
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));

    if (this.formGroup.value.options.profile) {
      this.collections = (<any>this.websiteService).getCollections(this.parentForm.getLoginProfileId(), this.formGroup.value.options.profile);
    }

    this.formGroup.get('options').get('profile').valueChanges.subscribe(profile => {
      this.collections = (<any>this.websiteService).getCollections(this.parentForm.getLoginProfileId(), profile);
      this.formGroup.get('options').get('folders').reset();
    });
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    if (this.profiles) {
      this.resetOnConflict('profile', this.profiles.map(p => p.name));
    }
  }

}
