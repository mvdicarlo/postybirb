import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { Validators } from '@angular/forms';
import { WebsiteCoordinatorService } from '../../../../commons/services/website-coordinator/website-coordinator.service';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'aryion-form',
  templateUrl: './aryion-form.component.html',
  styleUrls: ['./aryion-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => AryionFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AryionFormComponent extends BaseOptionForm {
  public folders: any[] = [];

  constructor(injector: Injector, websiteManager: WebsiteCoordinatorService) {
    super(injector);
    this.website = this.supportedWebsites.Aryion;

    this.folders = websiteManager.getInfo(this.website).folders || [];

    this.setOptionsForm({
      folderId: [this.folders[0].value || null, Validators.required],
      viewPerm: ['ALL', Validators.required],
      commentPerm: ['USER', Validators.required],
      tagPerm: ['USER', Validators.required],
      reqtag: [null, Validators.required],
      scraps: [false]
    });
  }

}
