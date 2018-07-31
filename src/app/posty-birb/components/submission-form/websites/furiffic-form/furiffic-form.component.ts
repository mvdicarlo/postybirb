import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'furiffic-form',
  templateUrl: './furiffic-form.component.html',
  styleUrls: ['./furiffic-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => FurifficFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FurifficFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Furiffic;

    this.setOptionsForm({});
  }

}
