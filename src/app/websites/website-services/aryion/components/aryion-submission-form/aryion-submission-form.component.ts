import { Component, OnInit, forwardRef, Injector, AfterViewInit } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { Folder } from 'src/app/websites/interfaces/folder.interface';
import { Validators } from '@angular/forms';

@Component({
  selector: 'aryion-submission-form',
  templateUrl: './aryion-submission-form.component.html',
  styleUrls: ['./aryion-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => AryionSubmissionForm) }],
  host: HOST_DATA
})
export class AryionSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit, AfterViewInit {

  public optionDefaults: any = {
      folderId: [null, Validators.required],
      viewPerm: ['ALL', Validators.required],
      commentPerm: ['USER', Validators.required],
      tagPerm: ['USER', Validators.required],
      reqtag: [null, Validators.required],
      scraps: [false]
    };

  public folders: Folder[] = [];

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.folders = this.websiteService.getFolders(this.parentForm.getLoginProfileId()) || [];
    if (!this.formGroup.get('options')) {
      this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
      if (this.folders.length) {
        this.formGroup.controls.options.patchValue({ folderId: (this.folders[0] || <any>{}).id });
      }
    }
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    if (this.folders && this.folders.length) {
      this.resetOnConflict('folderId', this.getIdsFromFolders(this.folders));
    }
  }

  public reqTagIsValid(): boolean {
    if (this.formGroup.get('options')) {
      return this.formGroup.controls.options.get('reqtag').valid;
    }

    return false;
  }

}
