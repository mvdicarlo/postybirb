import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';
import { Information } from '../../base-website-form/information.interface';

@Component({
  selector: 'furaffinity-form',
  templateUrl: './furaffinity-form.component.html',
  styleUrls: ['./furaffinity-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => FuraffinityFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FuraffinityFormComponent extends BaseWebsiteFormComponent {

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
      folders: [[]]
    });
  }

}
