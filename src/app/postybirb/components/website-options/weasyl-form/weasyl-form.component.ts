import { Component, Injector, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { BaseOptionForm } from '../../base-option-form/base-option-form.component';
import { SubmissionType } from '../../../enums/submission-type.enum';

@Component({
  selector: 'weasyl-form',
  templateUrl: './weasyl-form.component.html',
  styleUrls: ['./weasyl-form.component.css'],
  providers: [{ provide: BaseOptionForm, useExisting: forwardRef(() => WeasylFormComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeasylFormComponent extends BaseOptionForm {

  public submissionTypes: any = SubmissionType;

  constructor(injector: Injector) {
    super(injector);
    this.website = this.supportedWebsites.Weasyl;

    this.setOptionsForm({
      critique: [false],
      friendsOnly: [false],
      notify: [true],
      folder: [''],
      category: []
    });
  }

}
