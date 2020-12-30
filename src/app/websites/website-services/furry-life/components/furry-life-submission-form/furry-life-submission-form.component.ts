import { Component, OnInit, AfterViewInit, Injector, forwardRef } from '@angular/core';
import { TagConfig } from 'src/app/utils/components/tag-input/tag-input.component';
import {
  BaseWebsiteSubmissionForm,
  HOST_DATA,
} from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { Folder } from 'src/app/websites/interfaces/folder.interface';

@Component({
  selector: 'furry-life-submission-form',
  templateUrl: './furry-life-submission-form.component.html',
  styleUrls: ['./furry-life-submission-form.component.css'],
  providers: [
    { provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => FurryLifeSubmissionForm) },
  ],
  host: HOST_DATA,
})
export class FurryLifeSubmissionForm
  extends BaseWebsiteSubmissionForm
  implements OnInit, AfterViewInit {
  public optionDefaults: any = {
    credit: [''],
    copyright: [''],
    folder: ['general-sfw.712-sfw'],
  };

  public tagConfig: TagConfig = {
    minTags: 2,
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
