import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { NG_VALUE_ACCESSOR, Validators } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';

@Component({
  selector: 'hentai-foundry-form',
  templateUrl: './hentai-foundry-form.component.html',
  styleUrls: ['./hentai-foundry-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => HentaiFoundryFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HentaiFoundryFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.HentaiFoundry;

    this.setOptionsForm({
      scraps: [false],
      disableComments: [false],
      category: [null, Validators.required],
      nudityRating: ['0', Validators.required],
      violenceRating: ['0', Validators.required],
      profanityRating: ['0', Validators.required],
      racismRating: ['0', Validators.required],
      sexRating: ['0', Validators.required],
      spoilersRating: ['0', Validators.required],
      yaoi: [false],
      yuri: [false],
      teen: [false],
      guro: [false],
      furry: [false],
      beast: [false],
      male: [false],
      female: [false],
      futa: [false],
      other: [false],
      scat: [false],
      incest: [false],
      rape: [false],
      media: ['0', Validators.required],
      timeTaken: [null],
      license: ['0'],
      reference: [null]
    });
  }

}
