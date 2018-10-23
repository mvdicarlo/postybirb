import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'twitter-form',
  templateUrl: './twitter-form.component.html',
  styleUrls: ['./twitter-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => TwitterFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TwitterFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Twitter;

    this.setOptionsForm({});
  }

}
