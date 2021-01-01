import { Component, OnInit, Injector, forwardRef, AfterViewInit } from '@angular/core';
import {
  BaseWebsiteSubmissionForm,
  HOST_DATA,
} from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { Folder } from 'src/app/websites/interfaces/folder.interface';

@Component({
  selector: 'ko-fi-submission-form',
  templateUrl: './ko-fi-submission-form.component.html',
  styleUrls: ['./ko-fi-submission-form.component.css'],
  providers: [
    { provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => KoFiSubmissionForm) },
  ],
  host: HOST_DATA,
})
export class KoFiSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit, AfterViewInit {
  public optionDefaults: any = {
    audience: ['public'],
    hiRes: [false],
    folder: [''],
  };

  public folders: Folder[] = [];

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.folders = this.websiteService.getFolders(this.parentForm.getLoginProfileId()) || [];
    if (!this.formGroup.get('options'))
      this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    if (this.folders) {
      this.resetOnConflict('folder', this.getIdsFromFolders(this.folders));
    }
  }
}
