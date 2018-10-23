import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { Validators } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';
import { WebsiteManagerService } from '../../../../../commons/services/website-manager/website-manager.service';

@Component({
  selector: 'aryion-form',
  templateUrl: './aryion-form.component.html',
  styleUrls: ['./aryion-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => AryionFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AryionFormComponent extends BaseWebsiteFormComponent {

  public folders: any[] = [];

  constructor(injector: Injector, websiteManager: WebsiteManagerService) {
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
