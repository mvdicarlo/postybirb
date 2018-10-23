import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'weasyl-form',
  templateUrl: './weasyl-form.component.html',
  styleUrls: ['./weasyl-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => WeasylFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeasylFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Weasyl;

    this.requireValidTags(2);

    this.setOptionsForm({
      critique: [false],
      friendsOnly: [false],
      notify: [true],
      folder: ['']
    });
  }

}
