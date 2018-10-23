import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'mastodon-form',
  templateUrl: './mastodon-form.component.html',
  styleUrls: ['./mastodon-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => MastodonFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MastodonFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Mastodon;

    this.setOptionsForm({
      spoilerText: [null]
    });
  }

}
