import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseWebsiteFormComponent } from '../../base-website-form/base-website-form.component';
import { Information } from '../../base-website-form/information.interface';
import { MatTab } from '@angular/material';

@Component({
  selector: 'deviant-art-form',
  templateUrl: './deviant-art-form.component.html',
  styleUrls: ['./deviant-art-form.component.css'],
  providers: [{ provide: BaseWebsiteFormComponent, useExisting: forwardRef(() => DeviantArtFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeviantArtFormComponent extends BaseWebsiteFormComponent {

  constructor(injector: Injector) {
    super(injector);

    this.website = this.supportedWebsites.DeviantArt;

    this.setOptionsForm({
      feature: [false],
      disableComments: [false],
      stashOnly: [false],
      critique: [false],
      freeDownload: [false],
      folders: [[]],
      category: [],
      matureClassification: [[]],
      matureLevel: ['']
    });
  }

}
