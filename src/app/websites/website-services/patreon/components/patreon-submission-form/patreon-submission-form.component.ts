import { Component, OnInit, forwardRef, Injector, AfterViewInit } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { TagConfig } from 'src/app/utils/components/tag-input/tag-input.component';
import { Folder } from 'src/app/websites/interfaces/folder.interface';

@Component({
  selector: 'patreon-submission-form',
  templateUrl: './patreon-submission-form.component.html',
  styleUrls: ['./patreon-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => PatreonSubmissionForm) }],
  host: HOST_DATA
})
export class PatreonSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit, AfterViewInit {

  public optionDefaults: any = {
    tiers: [[]],
    chargePatrons: [false],
    schedule: [null],
    earlyAccess: [null]
  };

  public tagConfig: TagConfig = {
    maxTags: 50
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

    this.formGroup.controls.options.get('tiers').valueChanges.subscribe(tiers => {
      if (tiers && tiers.length > 1) {
        let exclusive: any[] = [];
        let nonExclusive: any[] = [];
        tiers.forEach(tier => {
          const found = this.folders.find(t => t.id === tier);
          if (found) exclusive.push(tier);
          else nonExclusive.push(tier);
        });

        if (exclusive.length && nonExclusive.length || exclusive.length > 1) {
          const keep = exclusive[exclusive.length - 1];
          this.formGroup.controls.options.get('tiers').patchValue([keep]);
        }
      }
    });
  }

}
