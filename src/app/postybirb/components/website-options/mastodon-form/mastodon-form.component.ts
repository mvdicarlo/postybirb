import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'mastodon-form',
  templateUrl: './mastodon-form.component.html',
  styleUrls: ['./mastodon-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => MastodonFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MastodonFormComponent extends BaseOptionForm {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Mastodon;

    this.setOptionsForm({
      spoilerText: [null],
      useTitle: [false]
    });
  }

}
