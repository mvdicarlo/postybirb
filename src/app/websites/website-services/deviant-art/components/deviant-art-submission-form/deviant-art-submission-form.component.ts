import { Component, OnInit, Injector, forwardRef, AfterViewInit } from '@angular/core';
import { Folder } from 'src/app/websites/interfaces/folder.interface';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';

@Component({
  selector: 'deviant-art-submission-form',
  templateUrl: './deviant-art-submission-form.component.html',
  styleUrls: ['./deviant-art-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => DeviantArtSubmissionForm) }],
  host: HOST_DATA
})
export class DeviantArtSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit, AfterViewInit {

  public optionDefaults: any = {
    feature: [false],
    disableComments: [false],
    critique: [false],
    freeDownload: [false],
    folders: [[]],
    matureClassification: [[]],
    matureLevel: [''],
    displayResolution: ['0']
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
