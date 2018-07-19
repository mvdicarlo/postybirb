import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';
import { Information } from '../../base-website-form/information.interface';

@Component({
  selector: 'tumblr-form',
  templateUrl: './tumblr-form.component.html',
  styleUrls: ['./tumblr-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => TumblrFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TumblrFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Tumblr;

    this.setOptionsForm({
      blog: [],
      useTitle: [true]
    });
  }

}
