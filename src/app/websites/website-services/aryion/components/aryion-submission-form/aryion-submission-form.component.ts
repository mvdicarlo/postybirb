import { Component, OnInit, forwardRef, Injector } from '@angular/core';
import { BaseWebsiteSubmissionForm } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { FolderCategory } from 'src/app/websites/interfaces/folder.interface';
import { Validators, FormControl } from '@angular/forms';

@Component({
  selector: 'aryion-submission-form',
  templateUrl: './aryion-submission-form.component.html',
  styleUrls: ['./aryion-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => AryionSubmissionForm) }],
  host: {
    'class': 'submission-form'
  }
})
export class AryionSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit {

  public optionDefaults: any = {
      folderId: [null, Validators.required],
      viewPerm: ['ALL', Validators.required],
      commentPerm: ['USER', Validators.required],
      tagPerm: ['USER', Validators.required],
      reqtag: [null, Validators.required],
      scraps: [false]
    };

  public folders: FolderCategory[] = [];

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.folders = this.websiteService.getFolders(this.parentForm.getLoginProfileId()) || [];
    if (!this.formGroup.get('tags')) this.formGroup.addControl('tags', new FormControl(null));
    if (!this.formGroup.get('description')) this.formGroup.addControl('description', new FormControl(null));
    if (!this.formGroup.get('options')) {
      this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
      this.formGroup.controls.options.patchValue({ folderId: (this.folders[0].folders[0] || <any>{}).id });
    }
  }

  public reqTagIsValid(): boolean {
    return this.formGroup.controls.options.get('reqtag').valid;
  }

}
