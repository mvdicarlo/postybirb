import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'derpibooru-form',
  templateUrl: './derpibooru-form.component.html',
  styleUrls: ['./derpibooru-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => DerpibooruFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DerpibooruFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Derpibooru;

    this.requireValidTags(3);

    this.setOptionsForm({
      sourceURL: ['']
    });
  }

}
