import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';
import { Information } from '../../base-website-form/information.interface';

@Component({
  selector: 'furry-network-form',
  templateUrl: './furry-network-form.component.html',
  styleUrls: ['./furry-network-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => FurryNetworkFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FurryNetworkFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.FurryNetwork;

    this.setOptionsForm({
      notify: [true],
      communityTags: [false],
      status: ['public'],
      profile: [null]
    });
  }

}
