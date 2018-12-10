import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { Validators } from '@angular/forms';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'newgrounds-form',
  templateUrl: './newgrounds-form.component.html',
  styleUrls: ['./newgrounds-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => NewgroundsFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewgroundsFormComponent extends BaseOptionForm {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Newgrounds;

    this.setOptionsForm({
      creativeCommons: [true],
      commercial: [false],
      modification: [true],
      sketch: [false],
      category: [1],
      nudity: [null, Validators.required],
      violence: [null, Validators.required],
      text: [null, Validators.required],
      adult: [null, Validators.required]
    });
  }

}
