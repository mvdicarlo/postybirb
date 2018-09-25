import { Component, Input, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';

import { DescriptionModel } from '../../../../posty-birb/components/submission-form/base-website-form/information.interface';
import { AdditionalOptions } from '../../../interfaces/additional-options.interface';
import { OptionsSectionDirective } from '../../../directives/options-section.directive';

@Component({
  selector: 'additional-options',
  templateUrl: './additional-options.component.html',
  styleUrls: ['./additional-options.component.css']
})
export class AdditionalOptionsComponent {

  @ViewChild(OptionsSectionDirective) optionsSection: OptionsSectionDirective;

  @Input()
  get config(): AdditionalOptions { return this._config }
  set config(config: AdditionalOptions) {
    this._config = config;
  }
  private _config: AdditionalOptions;

  @Input() defaultDescription: Observable<DescriptionModel>;

  public control = new FormControl();

  public values(): any {
    return {
      description: this.control.value,
      options: this.optionsSection ? this.optionsSection.component.formGroup.value : null
    };
  }

  public clear() {
    this.control.reset();
    if (this.optionsSection) {
      this.optionsSection.component.formGroup.reset();
    }
  }

}
