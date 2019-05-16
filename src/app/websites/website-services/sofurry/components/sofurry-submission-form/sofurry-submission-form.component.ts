import { Component, OnInit, forwardRef, Injector, AfterViewInit } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { TagConfig } from 'src/app/utils/components/tag-input/tag-input.component';
import { Folder } from 'src/app/websites/interfaces/folder.interface';

@Component({
  selector: 'sofurry-submission-form',
  templateUrl: './sofurry-submission-form.component.html',
  styleUrls: ['./sofurry-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => SofurrySubmissionForm) }],
  host: HOST_DATA
})
export class SofurrySubmissionForm extends BaseWebsiteSubmissionForm implements OnInit, AfterViewInit {

  public optionDefaults: any = {
    viewOptions: ['0'],
    folder: ['0']
  };

  public tagConfig: TagConfig = {
    minTags: 2
  };

  public folders: Folder[] = [];

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.folders = this.websiteService.getFolders(this.parentForm.getLoginProfileId()) || [];
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    if (this.folders) {
      this.resetOnConflict('folder', this.getIdsFromFolders(this.folders));
    }
  }

}
