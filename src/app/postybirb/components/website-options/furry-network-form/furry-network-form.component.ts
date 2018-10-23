import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';
import { FurryNetwork } from '../../../../commons/models/website/furrynetwork';

@Component({
  selector: 'furry-network-form',
  templateUrl: './furry-network-form.component.html',
  styleUrls: ['./furry-network-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => FurryNetworkFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FurryNetworkFormComponent extends BaseOptionForm {
  private collectionList: any = {};

  constructor(injector: Injector, private fn: FurryNetwork) {
    super(injector);
    this.website = this.supportedWebsites.FurryNetwork;

    this.setOptionsForm({
      notify: [true],
      communityTags: [false],
      status: ['public'],
      profile: [null],
      folders: [null]
    });

    this.optionsForm.controls.profile.valueChanges.subscribe((profile) => {
      this.collectionList = {};
      this.optionsForm.controls.folders.reset();
      this.collectionList = this.fn.getCollectionsForUser(profile);
      this._changeDetector.markForCheck();
    });
  }

  public getCollectionKeys(): string[] {
    return Object.keys(this.collectionList).sort();
  }

}
