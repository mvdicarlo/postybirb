import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'pixiv-form',
  templateUrl: './pixiv-form.component.html',
  styleUrls: ['./pixiv-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => PixivFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PixivFormComponent extends BaseOptionForm {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Pixiv;

    this.setOptionsForm({
      restrictSexual: ['0'],
      communityTags: [false],
      content: [],
      original: [false],
      sexual: [false],
      sexualTypes: []
    });
  }

}
