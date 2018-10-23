import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'derpibooru-form',
  templateUrl: './derpibooru-form.component.html',
  styleUrls: ['./derpibooru-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => DerpibooruFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DerpibooruFormComponent extends BaseOptionForm {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Derpibooru;

    this.setOptionsForm({
      sourceURL: ['']
    });
  }

}
