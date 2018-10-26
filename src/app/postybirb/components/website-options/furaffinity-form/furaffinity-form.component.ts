import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'furaffinity-form',
  templateUrl: './furaffinity-form.component.html',
  styleUrls: ['./furaffinity-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => FuraffinityFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FuraffinityFormComponent extends BaseOptionForm {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Furaffinity

    this.setOptionsForm({
      category: ['1'],
      species: ['1'],
      theme: ['1'],
      gender: ['0'],
      scraps: [false],
      disableComments: [false],
      folders: [[]],
      reupload: [false]
    });
  }

}
