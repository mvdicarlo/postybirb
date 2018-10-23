import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'inkbunny-form',
  templateUrl: './inkbunny-form.component.html',
  styleUrls: ['./inkbunny-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => InkbunnyFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InkbunnyFormComponent extends BaseOptionForm {

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
