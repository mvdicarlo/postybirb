import { Component, forwardRef, Injector, OnInit } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { Folder } from 'src/app/websites/interfaces/folder.interface';

@Component({
  selector: 'subscribestar-submission-form',
  templateUrl: './subscribestar-submission-form.component.html',
  styleUrls: ['./subscribestar-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => SubscribestarSubmissionForm) }],
  host: HOST_DATA
})
export class SubscribestarSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {
  public optionDefaults: any = {
    tier: ['basic'],
    useTitle: [true]
  };

  public tiers: Folder[] = [];


  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.tiers = this.websiteService.getFolders(this.parentForm.getLoginProfileId()) || [];
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    if (this.tiers) {
      this.resetOnConflict('tiers', this.getIdsFromFolders(this.tiers));
    }
  }

}
