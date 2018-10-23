import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'inkbunny-form',
  templateUrl: './inkbunny-form.component.html',
  styleUrls: ['./inkbunny-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => InkbunnyFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InkbunnyFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Inkbunny;

    this.setOptionsForm({
      blockGuests: [false],
      friendsOnly: [false],
      notify: [true],
      scraps: [false]
    });
  }

}
