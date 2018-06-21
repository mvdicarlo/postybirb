import { Component, Injector, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';
import { Information } from '../../base-website-form/information.interface';

@Component({
  selector: 'weasyl-form',
  templateUrl: './weasyl-form.component.html',
  styleUrls: ['./weasyl-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => WeasylFormComponent) }]
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
