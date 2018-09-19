import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'pixiv-form',
  templateUrl: './pixiv-form.component.html',
  styleUrls: ['./pixiv-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => PixivFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PixivFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Pixiv;

    this.requireValidTags(1);

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
