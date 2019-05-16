import { Component, OnInit, forwardRef, Injector, AfterViewInit } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { TagConfig } from 'src/app/utils/components/tag-input/tag-input.component';
import { Folder } from 'src/app/websites/interfaces/folder.interface';

@Component({
  selector: 'weasyl-submission-form',
  templateUrl: './weasyl-submission-form.component.html',
  styleUrls: ['./weasyl-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => WeasylSubmissionForm) }],
  host: HOST_DATA
})
export class WeasylSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit, AfterViewInit {

  public optionDefaults: any = {
    critique: [false],
    friendsOnly: [false],
    notify: [true],
    folder: [''],
    category: []
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
