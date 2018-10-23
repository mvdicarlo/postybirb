import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';

@Component({
  selector: 'deviant-art-form',
  templateUrl: './deviant-art-form.component.html',
  styleUrls: ['./deviant-art-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => DeviantArtFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeviantArtFormComponent extends BaseOptionForm {

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
