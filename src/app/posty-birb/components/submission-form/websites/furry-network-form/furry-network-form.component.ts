import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';
import { FurryNetwork } from '../../../../../commons/models/website/furrynetwork';

@Component({
  selector: 'furry-network-form',
  templateUrl: './furry-network-form.component.html',
  styleUrls: ['./furry-network-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => FurryNetworkFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FurryNetworkFormComponent extends BaseWebsiteFormComponent {
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

  public writeValue(model: any) {
    if (model) {
      if (!this.areEqual(model.description, this.form.value.description)) this.form.controls.description.patchValue(model.description, { emitEvent: false });
      if (!this.areEqual(model.tags, this.form.value.tags)) this.form.controls.tags.patchValue(model.tags, { emitEvent: false });
      if (!this.areEqual(model.options, this.optionsForm.value)) {
        this.optionsForm.patchValue(model.options, { emitEvent: false });
        this.collectionList = this.fn.getCollectionsForUser(model.options.profile);
        this._changeDetector.markForCheck();
      }
    } else {
      this.clear();
    }
  }

  public getCollectionKeys(): string[] {
    return Object.keys(this.collectionList).sort();
  }

}
