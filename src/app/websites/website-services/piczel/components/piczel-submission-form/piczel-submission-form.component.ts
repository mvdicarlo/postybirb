import { Component, OnInit, Injector, forwardRef, AfterViewInit } from '@angular/core';
import { Folder } from 'src/app/websites/interfaces/folder.interface';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { SubmissionRating } from 'src/app/database/tables/submission.table';

@Component({
  selector: 'piczel-submission-form',
  templateUrl: './piczel-submission-form.component.html',
  styleUrls: ['./piczel-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => PiczelSubmissionForm) }],
  host: HOST_DATA
})
export class PiczelSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit, AfterViewInit {

  public optionDefaults: any = {
    nsfw: [false],
    folder: []
  };

  public folders: Folder[] = [];

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.folders = this.websiteService.getFolders(this.parentForm.getLoginProfileId()) || [];
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));

    if (this.rating === SubmissionRating.ADULT || this.rating === SubmissionRating.EXTREME) {
      this.formGroup.controls.options.patchValue({ nsfw: true });
    }
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    if (this.folders) {
      this.resetOnConflict('folder', this.getIdsFromFolders(this.folders));
    }
  }

}
