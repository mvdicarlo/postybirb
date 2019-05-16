import { Component, OnInit, Injector, forwardRef, AfterViewInit } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { TagConfig } from 'src/app/utils/components/tag-input/tag-input.component';
import { Folder } from 'src/app/websites/interfaces/folder.interface';

@Component({
  selector: 'fur-affinity-submission-form',
  templateUrl: './fur-affinity-submission-form.component.html',
  styleUrls: ['./fur-affinity-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => FurAffinitySubmissionForm) }],
  host: HOST_DATA
})
export class FurAffinitySubmissionForm extends BaseWebsiteSubmissionForm implements OnInit, AfterViewInit {

  public optionDefaults: any = {
    category: ['1'],
    species: ['1'],
    theme: ['1'],
    gender: ['0'],
    scraps: [false],
    disableComments: [false],
    folders: [[]],
    reupload: [true]
  };

  public tagConfig: TagConfig = {
    maxStringLength: 250
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
      this.resetOnConflict('folders', this.getIdsFromFolders(this.folders));
    }
  }
}
